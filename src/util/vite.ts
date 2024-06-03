import path from 'path'
import {
  CallExpression,
  Node,
  ObjectLiteralExpression,
  Project,
  PropertyAssignment,
  SourceFile,
  SyntaxKind,
} from 'ts-morph'
import { VitePlugin } from '../mixins/mixin'

let prettier: typeof import('prettier') | undefined

/**
 * Add Vite plugins to the vite.config.ts file.
 *
 * This function expects your config file to have a `defineConfig` call whose first argument is
 * either an object literal or a function that returns an object literal. Within that object
 * literal, it expects there to be a `plugins` property with an array literal as its property value.
 */
export function addVitePlugins(
  project: Project,
  plugins: VitePlugin[]
): Promise<string>
export function addVitePlugins(
  configPath: string,
  plugins: VitePlugin[]
): Promise<void>
export async function addVitePlugins(
  arg: string | Project,
  plugins: VitePlugin[]
): Promise<any> {
  let cwd: string
  let project: Project
  let configFile: SourceFile
  if (arg instanceof Project) {
    cwd = ''
    project = arg
    configFile = project.getSourceFileOrThrow('vite.config.ts')
  } else {
    cwd = process.cwd()
    project = new Project()
    configFile = project.addSourceFileAtPath(arg)
  }

  const configPath = path.relative(cwd, configFile.getFilePath())

  // Find the call to defineConfig
  const callExpressions = configFile.getDescendantsOfKind(
    SyntaxKind.CallExpression
  )
  const defineConfigCall = callExpressions.find(callExpression => {
    const expression = callExpression.getExpression()
    // Check if an identifier.
    if (Node.isIdentifier(expression)) {
      return expression.getText() === 'defineConfig'
    }
  }) as CallExpression | undefined

  const ConfigError = (msg: string) => Error(configPath + ': ' + msg)

  if (!defineConfigCall) {
    throw ConfigError(`Could not find defineConfig call`)
  }

  const [firstArgument] = defineConfigCall.getArguments()

  let objectLiteral: ObjectLiteralExpression | undefined
  if (Node.isObjectLiteralExpression(firstArgument)) {
    objectLiteral = firstArgument
  } else if (Node.isFunctionLikeDeclaration(firstArgument)) {
    const arrowBody =
      Node.isArrowFunction(firstArgument) && firstArgument.getBody()

    const returnStmt =
      (arrowBody && Node.isParenthesizedExpression(arrowBody) && arrowBody) ||
      firstArgument.getStatements().find(Node.isReturnStatement)

    if (!returnStmt) {
      throw ConfigError('Could not find return statement in defineConfig call')
    }

    objectLiteral = returnStmt.getExpressionIfKind(
      SyntaxKind.ObjectLiteralExpression
    )

    if (!objectLiteral) {
      throw ConfigError('Could not find object literal in return statement')
    }
  } else {
    throw ConfigError('Could not find object literal in defineConfig call')
  }

  const pluginsProperty = objectLiteral.getProperties().find(prop => {
    if (!Node.isPropertyAssignment(prop)) {
      return false
    }
    return prop.getNameNode().getText() === 'plugins'
  }) as PropertyAssignment | undefined

  if (!pluginsProperty) {
    throw ConfigError('Could not find "plugins" property in defineConfig call')
  }

  const pluginsArray = pluginsProperty.getInitializerIfKind(
    SyntaxKind.ArrayLiteralExpression
  )
  if (!pluginsArray) {
    throw ConfigError('Could not find "plugins" array in defineConfig call')
  }

  // Get the first statement after the `vite` import.
  const index = configFile.getStatements().findIndex((_stmt, i, stmts) => {
    const prevStmt = stmts[i - 1]
    return (
      prevStmt &&
      Node.isImportDeclaration(prevStmt) &&
      prevStmt.getModuleSpecifierValue() === 'vite'
    )
  })
  if (!index) {
    throw ConfigError('Could not find "vite" import')
  }

  const pluginCount = pluginsArray.getElements().length

  for (const plugin of plugins) {
    configFile.insertStatements(
      pluginCount > 0 ? index + 1 : index,
      `import ${plugin.import}\n`
    )
    pluginsArray.addElement(plugin.create)
  }

  // Format the config file.
  prettier ||= await import('prettier')
  const formatOptions = await prettier.resolveConfig(configPath)
  const formatted = await prettier.format(configFile.getFullText(), {
    ...formatOptions,
    filepath: configPath,
  })

  if (arg instanceof Project) {
    return formatted
  }

  configFile.replaceWithText(formatted)
  return configFile.save()
}
