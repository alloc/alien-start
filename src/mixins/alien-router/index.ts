import dedent from 'dedent'
import fs from 'fs'
import prompts from 'prompts'
import { loadMixin } from '../../use'
import { info } from '../../util/log'
import { Mixin, defineMixin } from '../mixin'

export default defineMixin(async (): Promise<Mixin | null> => {
  try {
    // TODO: Automatically migrate this module into the "web/src/routes/home.tsx" module, using
    // ts-morph to manipulate the TypeScript AST.
    fs.renameSync('web/src/App.tsx', 'web/src/App.tsx.bak')
    info('\nRenamed "web/src/App.tsx" to prevent collision.')
    info(
      '⚠️ NOTE: You\'ll want to migrate your <App/> component to the "web/src/routes/home.tsx" module (inside the <HomeRoute/> component).\n'
    )
    info()
    info(
      'With your permission, I will now update your "web/src/main.tsx" module to use the generated alien-router app. This will delete any modifications you made to this module, so you may want to migrate that code to another module before continuing.'
    )

    const { cont } = await prompts({
      type: 'confirm',
      name: 'cont',
      message: 'Ready to continue?',
    })

    if (!cont) {
      return null
    }
  } catch {
    info(
      '⚠️ NOTE: Unrecognized project structure. Skipping automatic setup of the entry point. You\'ll want to import the `app` object from "web/src/app.ts" and call its `.mount(document.body)` method after. See the readme of alien-router for more details.'
    )
  }

  return {
    name: 'alien-router',
    apply: [loadMixin(import('../codegentool'))],
    packages: {
      web: {
        dependencies: {
          '@alien-dom/router': 'latest',
        },
      },
      generators: {
        dependencies: {
          '@alien-dom/router': 'latest',
        },
      },
    },
    template: {
      from: 'alien-router',
      copy: [['routes', 'web/src/routes']],
    },
    files: [
      {
        name: 'generators/web/app.ts',
        content: dedent`
          import defineApp from '@alien-dom/router/generators/app'

          export default defineApp({
            routes: ['web/src/routes/*.tsx', 'web/src/routes/*/index.tsx'],
            outPath: 'web/src/app.ts',
          })
        `,
      },
      {
        name: 'web/src/main.tsx',
        content: dedent`
          import { app } from './app'

          app.mount(document.body)
        `,
      },
    ],
    exec: [
      {
        message: 'Generating the app module...',
        cmd: 'pnpm',
        args: ['-s', 'codegentool'],
        stdio: 'inherit',
      },
    ],
  }
})
