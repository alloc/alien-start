#!/usr/bin/env node
import cac from 'cac'
import { $, execa } from 'execa'
import { readFileSync, writeFileSync } from 'fs'
import { bold, cyan, green, yellow } from 'kleur/colors'
import prompts from 'prompts'
import { Context } from './context'
import { runScripts } from './scripts/run'
import { MixinSpec, useMixin } from './use'
import { gitCommitAll, gitHead } from './util/git'
import { fatal, info } from './util/log'
import { readPackageData, writePackageData } from './util/package'
import { which, whichRequire } from './util/which'

const cli = cac('alien-start')

cli.command('init', 'Initialize a new project').action(async () => {
  await expectCleanRepo()

  const pkg = readPackageData()
  if (!pkg.scripts?.prepare?.includes('alien-start init')) {
    fatal(
      'You cannot run "alien-start init" except in a prepare script.\n' +
        'This command is meant for bootstrapping a new project cloned from a template with alien-start installed.'
    )
  }

  let skipRename = false
  if (!(await which('rg'))) {
    info(
      `Please install ${bold('ripgrep')} with ${cyan('`brew install ripgrep`')} if you want to rename your project.\n`
    )

    const ctrl = new AbortController()
    const { skip } = await Promise.race([
      prompts({
        name: 'skip',
        type: 'confirm',
        message: 'Do you want to skip renaming your project?',
      }),
      // Check if `rg` is installed every second.
      whichRequire('rg', 1000, ctrl.signal).then(() => ({ skip: false })),
    ])

    if (skip == null) {
      process.exit()
    }

    ctrl.abort()
    skipRename = skip === true
  }

  if (!skipRename) {
    if (!pkg.name) {
      fatal('Package "name" is missing from package.json')
    }

    let { name } = await prompts({
      name: 'name',
      type: 'text',
      message: 'Project name (kebab-cased)',
    })

    if (name == null) {
      process.exit()
    }

    name = name.toLowerCase().replace(/\s/g, '-')
    await findAndReplace(pkg.name, name)
    pkg.name = name
  }

  delete pkg.scripts.prepare
  await writePackageData(pkg)

  info('\nPinning dependencies to current major versions...')
  await execa('pnpm', ['-r', 'up', '-L'], { stdio: 'inherit' })

  await gitCommitAll('chore: initialize project with alien-start')

  info('\nProject initialized successfully!')
})

cli
  .command('use [...mixins]', 'Enhance your project with instant integrations')
  .action(async (mixins: MixinSpec[]) => {
    await expectCleanRepo()

    if (!mixins.length) {
      const mixinRegistry = (await import('./mixins')).default
      const { selected }: { selected: string[] } = await prompts({
        name: 'selected',
        type: 'autocompleteMultiselect',
        message: 'Choose a tool to enhance your project',
        choices: mixinRegistry.map(mixin => ({
          title: mixin.title,
          description: mixin.url,
          value: mixin,
        })),
      })
      if (selected == null) {
        process.exit()
      }
      mixins = selected
    }

    const context: Context = {
      root: process.cwd(),
      pkg: readPackageData(),
      commit: await gitHead(),
    }

    for (const mixin of mixins) {
      await useMixin(mixin, context)
    }
  })

cli
  .command('run <script>', 'Run a group of scripts')
  .action(async (script: string) => {
    await runScripts(`scripts/${script}/pre`)
    await runScripts(`scripts/${script}`, { parallel: script === 'dev' })
    if (script !== 'dev') {
      await runScripts(`scripts/${script}/post`)
    }
  })

declare const __VERSION__: string
cli.version(__VERSION__)

if (process.argv.length === 2) {
  cli.outputHelp()
} else {
  cli.help()
  cli.parse()
}

async function findAndReplace(pattern: string, replacement: string) {
  const { stdout } = await $`rg --vimgrep ${pattern}`

  const matches: Record<string, number[]> = {}
  for (const range of stdout.split('\n')) {
    const [file, line] = range.split(':')
    matches[file] ||= []
    matches[file].push(Number(line))
  }

  for (const file in matches) {
    let lines = readFileSync(file, 'utf8').split('\n')
    for (const match of matches[file]) {
      lines[match] = lines[match].replace(new RegExp(pattern, 'g'), replacement)
    }
    writeFileSync(file, lines.join('\n'))
    info(
      `Found and replaced ${yellow(pattern)} with ${green(replacement)} in ${file}`
    )
  }
}

async function expectCleanRepo() {
  const { stdout } = await $`git status --porcelain`
  if (stdout.trim()) {
    fatal(
      'Please commit or stash your changes before running "alien-start use".'
    )
  }
}
