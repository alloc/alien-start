#!/usr/bin/env node
import cac from 'cac'
import prompts from 'prompts'
import { Context } from './context'
import { runScripts } from './scripts/run'
import { MixinSpec, useMixin } from './use'
import { expectCleanRepo, gitHead } from './util/git'
import { readPackageData } from './util/package'

const cli = cac('alien-start')

cli.command('init', 'Initialize a new project').action(async () => {
  const { init } = await import('./init')
  await init()
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
