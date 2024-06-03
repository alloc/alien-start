import { jaroWinkler } from '@skyra/jaro-winkler'
import { execa } from 'execa'
import glob from 'fast-glob'
import fs from 'fs'
import path from 'path'
import prompts from 'prompts'
import { isNativeError, isPromise } from 'util/types'
import yaml from 'yaml'
import { Context } from './context'
import {
  Mixin,
  MixinExport,
  MixinFactory,
  MixinModule,
  PackageJsonMixin,
  ScriptExec,
  TemplateCopyDeclaration,
} from './mixins/mixin'
import { gitCommitAll, gitResetHard } from './util/git'
import { error, fatal, info } from './util/log'
import {
  mergePackageData,
  readPackageData,
  writePackageData,
} from './util/package'
import { addVitePlugins } from './util/vite'

export type MixinSpec<Options = {}> =
  | string
  | MixinModule<Options>
  | Mixin
  | MixinFactory
  | Promise<Mixin | MixinFactory>

export async function loadMixin<Options>(
  promise: Promise<{ default: MixinExport<Options> }>,
  options?: Options
): Promise<Mixin | MixinFactory> {
  return (await promise).default((options ?? {}) as Options)
}

export async function useMixin<Options = {}>(
  mixin: MixinSpec<Options> | null,
  ctx: Context,
  options?: Options
) {
  if (mixin == null) {
    return
  }
  if (typeof mixin === 'string') {
    const name = mixin

    const mixins = (await import('./mixins')).default
    const matches = mixins.map(mixin => {
      return {
        mixin,
        score: jaroWinkler(name, mixin.title.toLowerCase().replace(/ /g, '-')),
      }
    })

    matches.sort((a, b) => b.score - a.score)
    if (matches[0].score !== 1) {
      const { useBestMatch } = await prompts({
        type: 'confirm',
        name: 'useBestMatch',
        message: `Mixin not found. Did you mean ${matches[0].mixin.title}?`,
      })

      if (!useBestMatch) {
        process.exit()
      }
    }

    mixin = matches[0].mixin as MixinModule<Options>
  }
  if (isMixinModule(mixin)) {
    mixin = await loadMixin(mixin.import(), options)
  }

  const previousWorkingDir = process.cwd()
  process.chdir(ctx.root)
  try {
    if (isPromise(mixin)) {
      mixin = await mixin
    }
    if (typeof mixin === 'function') {
      mixin = mixin(ctx)

      if (mixin == null) {
        return
      }
      if (isPromise(mixin)) {
        mixin = (await mixin) as Mixin
      }
    }

    if (mixin.apply) {
      for (const parentMixin of mixin.apply) {
        await useMixin(parentMixin, { ...ctx, caller: mixin })
      }
    }

    let prettier: typeof import('prettier')

    const dirs = new Set<string>()
    const ensureDir = (dir: string) => {
      dir = path.resolve(dir)
      if (!dirs.has(dir)) {
        dirs.add(dir)
        fs.mkdirSync(dir, { recursive: true })
        while (dir !== ctx.root) {
          dir = path.dirname(dir)
          dirs.add(dir)
        }
      }
    }

    if (mixin.files) {
      for (const file of mixin.files) {
        const filename = path.join(ctx.root, file.name)
        const type = path.extname(file.name)

        if (typeof file.content !== 'string') {
          if (type === '.json') {
            file.content = JSON.stringify(file.content, null, 2)
          } else if (type === '.yaml' || type === '.yml') {
            file.content = yaml.stringify(file.content, null, 2)
          } else {
            throw Error(`File content of "${file.name}" must be a string`)
          }
        }

        prettier ||= await import('prettier')
        const formatOptions = await prettier.resolveConfig(filename)
        const fileInfo = await prettier.getFileInfo(filename, {
          plugins: formatOptions?.plugins,
        })

        if (fileInfo.inferredParser && !fileInfo.ignored) {
          file.content = await prettier.format(file.content, {
            ...formatOptions,
            filepath: filename,
            parser: fileInfo.inferredParser,
          })
        }

        ensureDir(path.dirname(file.name))
        fs.writeFileSync(file.name, file.content)
        if (file.mode) {
          fs.chmodSync(file.name, file.mode)
        }
        info(`Created file "${file.name}"`)
      }
    }

    if (mixin.append) {
      for (const file of mixin.append) {
        fs.appendFileSync(file.name, '\n' + file.content + '\n')
        info(`Appended to file "${file.name}"`)
      }
    }

    if (mixin.template) {
      prettier ||= await import('prettier')

      for (const source of mixin.template.copy) {
        await copyTemplateFiles(
          mixin.template.from,
          source,
          async (source, dest) => {
            dest = path.join(ctx.root, dest)
            ensureDir(path.dirname(dest))

            const formatOptions = await prettier.resolveConfig(dest)
            const fileInfo = await prettier.getFileInfo(dest, {
              plugins: formatOptions?.plugins,
            })

            if (fileInfo.inferredParser && !fileInfo.ignored) {
              let content = fs.readFileSync(source, 'utf-8')
              content = await prettier.format(content, {
                ...formatOptions,
                filepath: dest,
                parser: fileInfo.inferredParser,
              })
              fs.writeFileSync(dest, content)
            } else {
              fs.copyFileSync(source, dest)
            }
          }
        )
      }
    }

    if (mixin.vite) {
      await addVitePlugins('web/vite.config.ts', mixin.vite.plugins)
    }

    if (mixin.workspace) {
      if (mixin.workspace.packages) {
        const filename = path.resolve('pnpm-workspace.yaml')
        const workspace: {
          packages: string[]
        } = yaml.parse(fs.readFileSync(filename, 'utf-8'))

        workspace.packages.push(...mixin.workspace.packages)

        prettier ||= await import('prettier')
        const formatOptions = await prettier.resolveConfig(filename)

        fs.writeFileSync(
          filename,
          await prettier.format(yaml.stringify(workspace), {
            ...formatOptions,
            filepath: filename,
          })
        )
        info(`Updated pnpm-workspace.yaml`)
      }
      if (Object.keys(omitProperties(mixin.workspace, 'packages')).length > 0) {
        await updatePackageData('.', mixin.workspace, mixin)
      }
    }

    if (mixin.packages) {
      for (const dir in mixin.packages) {
        if (dir === '' || dir === '.' || dir === './') {
          error(
            `To update the root package.json, use the "workspace" property.`
          )
          continue
        }
        await updatePackageData(dir, mixin.packages[dir], mixin)
      }
    }

    if (mixin.gitignore) {
      const filename = path.resolve('.gitignore')
      const gitignore = fs.readFileSync(filename, 'utf-8')
      fs.writeFileSync(
        filename,
        gitignore +
          ('\n\n# ' + mixin.gitignore.comment) +
          ('\n' + mixin.gitignore.globs.join('\n'))
      )
      info(`Updated .gitignore`)
    }

    if (mixin.upgrade) {
      mixin.exec ||= []
      for (const up of mixin.upgrade) {
        mixin.exec.push({
          message: `Upgrading dependencies in "${up.cwd}"`,
          cmd: 'pnpm',
          args: ['up', ...up.deps],
          cwd: up.cwd,
        })
      }
    }

    if (mixin.exec) {
      let postScripts: ScriptExec[] | undefined
      for (const script of mixin.exec) {
        if (ctx.caller && script.enforce === 'post') {
          postScripts ||= []
          postScripts.push(script)
          continue
        }

        info(script.message)
        try {
          await execa(script.cmd, script.args, {
            cwd: path.join(ctx.root, script.cwd || ''),
            stdio: script.stdio,
          })
        } catch (error) {
          if (script.stdio === 'inherit') {
            fatal(isNativeError(error) ? error.message : String(error))
          }
          throw error
        }
      }
      if (ctx.caller && postScripts) {
        ctx.caller.exec ||= []
        ctx.caller.exec.unshift(...postScripts)
      }
    }

    await gitCommitAll(`chore: apply "${mixin.name}" mixin`)
    if (ctx.caller) {
      console.log()
    }
  } catch {
    const { shouldRevert } = await prompts({
      name: 'shouldRevert',
      type: 'confirm',
      message: 'Mixin failed. Revert all changes?',
    })

    if (shouldRevert) {
      await gitResetHard(ctx.commit)
    }
    process.exit()
  } finally {
    process.chdir(previousWorkingDir)
  }
}

function isMixinModule<Options>(
  mixin: Exclude<MixinSpec<Options>, string>
): mixin is MixinModule<Options> {
  return 'import' in mixin && typeof mixin.import === 'function'
}

async function copyTemplateFiles(
  from: string,
  source: TemplateCopyDeclaration,
  copyFile: (source: string, dest: string) => Promise<void>
) {
  const templateDir = new URL(
    path.posix.join('../templates', from),
    import.meta.url
  ).pathname

  let cwd: string
  let dest = ''
  if (typeof source === 'string') {
    cwd = templateDir
  } else {
    dest = source[1]
    if (typeof source[0] === 'string') {
      cwd = templateDir
      source = source[0]
    } else {
      cwd = path.join(templateDir, source[0].cwd)
      source = source[0].glob
    }
  }

  if (!source.includes('*')) {
    if (isFile(path.join(cwd, source))) {
      await copyFile(path.join(cwd, source), dest)
      info(`Copied file "${dest}" from ${from} template`)
      return
    }

    cwd = path.join(cwd, source)
    source = '**/*'
  }

  const files = glob.sync(source, { cwd })
  for (let file of files) {
    await copyFile(path.join(cwd, file), path.join(dest, file))
    info(`Copied file "${path.join(dest, file)}" from ${from} template`)
  }
}

function isFile(source: string) {
  try {
    return fs.statSync(source).isFile()
  } catch {
    return false
  }
}

async function updatePackageData(
  dir: string,
  data: PackageJsonMixin,
  mixin: Mixin
) {
  let pkg = readPackageData(dir)
  mergePackageData(pkg, {
    dependencies: data.dependencies,
    devDependencies: data.devDependencies,
    scripts: data.scripts,
  })

  if (data.updatePackage) {
    const result = data.updatePackage(pkg)
    if (result !== undefined) {
      pkg = result
    }
  }

  await writePackageData(pkg, dir)
  info(`Updated ${path.join(dir, 'package.json')}`)

  if (data.dependencies || data.devDependencies) {
    mixin.upgrade ||= []
    mixin.upgrade.push({
      cwd: dir,
      deps: Object.keys({
        ...data.dependencies,
        ...data.devDependencies,
      }).map(name => {
        const version =
          data.devDependencies?.[name] ?? data.dependencies?.[name]

        return `${name}@${version}`
      }),
    })
  }
}

function omitProperties<T>(o: T, ...keys: (keyof T)[]): Omit<T, keyof T> {
  const result = { ...o }
  for (const key of keys) {
    delete result[key]
  }
  return result
}
