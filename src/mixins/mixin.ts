import { PackageJson } from 'type-fest'
import { Context } from '../context'
import { MixinSpec } from '../use'

export function defineMixin(mixin: Mixin): () => Mixin

export function defineMixin<Options = {}>(
  mixin: (
    ctx: Context,
    options: Options
  ) => Mixin | Promise<Mixin | null> | null
): (options?: Options) => MixinFactory

export function defineMixin<Options = {}>(mixin: MixinDefinition<any>) {
  if (typeof mixin !== 'function') {
    return () => mixin
  }
  return (options?: Options) => (ctx: Context) => mixin(ctx, options ?? {})
}

export type MixinDefinition<Options = {}> =
  | ((ctx: Context, options: Options) => Mixin | Promise<Mixin | null> | null)
  | Mixin

export interface MixinModule<Options = {}> {
  title: string
  url?: string
  import: () => Promise<{
    default: MixinExport<Options>
  }>
}

export type MixinExport<Options = {}> =
  | (() => Mixin)
  | ((options: Options) => MixinFactory)

export type MixinFactory = (context: Context) => Mixin | Promise<Mixin> | null

export interface Mixin {
  name: string
  /** Append to existing files. */
  append?: {
    name: string
    content: string
  }[]
  /** Apply other mixins before this one. */
  apply?: MixinSpec[]
  /**
   * Execute commands after the mixin is applied. All commands are executed in the order they are
   * defined, one after the other.
   */
  exec?: ScriptExec[]
  /** Generated files */
  files?: {
    name: string
    content: string | object
    mode?: number
  }[]
  /** Instruct git to ignore certain files. */
  gitignore?: {
    /** Prefix the added globs with a comment. */
    comment: string
    /** Globs to add to the .gitignore file. */
    globs: string[]
  }
  /** Add to package.json files. */
  packages?: {
    [dir: string]: PackageJsonMixin
  }
  /** Templates provide files to copy into the project. */
  template?: {
    /** The template subdirectory being used. */
    from: string
    /** Files to copy from the template. */
    copy: TemplateCopyDeclaration[]
  }
  /** Dependencies in the workspace to upgrade with PNPM. */
  upgrade?: {
    deps: string[]
    cwd: string
  }[]
  /** Vite configuration */
  vite?: {
    plugins: VitePlugin[]
  }
  /** Add to root package.json file and/or `pnpm-workspace.yaml` file. */
  workspace?: PackageJsonMixin & {
    /** Package globs to add to the workspace. */
    packages?: string[]
  }
}

export interface PackageJsonMixin {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  /**
   * Receive the current contents of the package.json file and return the new contents.
   */
  updatePackage?: (pkg: PackageJson) => PackageJson | void
}

export interface VitePlugin {
  /** Everything in an import statement, except the leading `import` keyword. Spliced into the Vite config. */
  import: string
  /** The TypeScript expression that instantiates the plugin. Spliced into the Vite config. */
  create: string
}

export interface ScriptExec {
  /** A message to display before running the command. */
  message: string
  /** The command executable to use. */
  cmd: string
  /** The arguments to pass to the command. */
  args: any[]
  /**
   * The `stdio` option for the command.
   * @see https://nodejs.org/api/child_process.html#optionsstdio
   */
  stdio?: 'inherit'
  /** The working directory for the command. */
  cwd?: string
  /**
   * Control when the command is executed. If the value is `"post"`, the command is executed after
   * all other mixins (their commands and yours) have been applied.
   */
  enforce?: 'post'
}

export type TemplateCopyDeclaration =
  | [from: string | { glob: string; cwd: string }, to: string]
  | string
