import dedent from 'dedent'
import { PackageJson } from 'type-fest'
import { generateImports } from '../../util/imports'
import { resolveOptions } from '../../util/options'
import { Mixin, defineMixin } from '../mixin'

type HattipFeature = 'router' | 'cookie'

export type Options = {
  /**
   * Hattip options
   */
  hattip?: {
    /**
     * Hattip features to enable
     */
    features?: HattipFeature[]
  }
}

export default defineMixin<Options>(async (ctx, options): Promise<Mixin> => {
  await resolveOptions(options, {
    hattip: {
      features: {
        type: 'multiselect',
        message: 'What Hattip features do you want to enable?',
        choices: [
          {
            title: 'Router',
            value: 'router',
            description: 'Express-style request routing',
          },
          {
            title: 'Cookie',
            value: 'cookie',
            description: 'Automatic cookie parsing',
          },
        ],
      },
    },
  })

  const pkg = {
    name: '@' + ctx.pkg.name + '/server',
    type: 'module',
    dependencies: <Record<string, string>>{
      '@hattip/compose': 'latest',
    },
    scripts: <Record<string, string>>{
      lint: 'tsc -p . --noEmit',
    },
  } satisfies PackageJson

  // The Hattip features to enable.
  const features: HattipFeature[] = options.hattip?.features || []

  // The imports to add to the handler file.
  const imports: Record<string, Set<string>> = {
    '@hattip/compose': new Set(['compose']),
  }

  // The composed HTTP handlers.
  const composed: string[] = []

  // The HTTP handler implementation.
  let handler = ''

  if (features.includes('cookie')) {
    pkg.dependencies['@hattip/cookie'] = 'latest'
    imports['@hattip/cookie'] = new Set(['cookie'])
    composed.push('cookie()')
  }

  if (features.includes('router')) {
    pkg.dependencies['@hattip/router'] = 'latest'
    imports['@hattip/router'] = new Set(['createRouter'])
    handler = dedent`
      const app = createRouter()
      ${composed.length > 0 ? ['', ...composed, ''].map(c => `app.use(${c})`).join('\n') : ''}
      app.get('/', req => {
        return new Response('Hello World')
      })

      export default app.buildHandler()
    `
  } else {
    imports['@hattip/compose'].add('RequestHandler')
    composed.push('onRequest')
    handler = dedent`
      const onRequest: RequestHandler = req => {
        return new Response('Hello World')
      }

      export default compose(${composed.join(', ')})
    `
  }

  return {
    name: 'backend',
    files: [
      {
        name: 'backend/server/package.json',
        content: pkg,
      },
      {
        name: 'backend/server/src/handler.ts',
        content: dedent`
          ${generateImports(imports)}

          ${handler}
        `,
      },
    ],
    packages: {
      'backend/server': {
        scripts: {
          dev: 'tsup-node --sourcemap --watch',
          build: 'tsup-node',
        },
      },
    },
    workspace: {
      packages: ['backend/server'],
    },
  }
})
