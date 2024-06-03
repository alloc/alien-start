import backend, { Options as BackendOptions } from '../backend'
import { Mixin, defineMixin } from '../mixin'

export type Options = BackendOptions

export default defineMixin<Options>(
  (_ctx, options): Mixin => ({
    name: 'bun-api',
    apply: [backend(options)],
    packages: {
      'backend/server': {
        dependencies: {
          '@hattip/adapter-bun': 'latest',
        },
        devDependencies: {
          '@types/bun': 'latest',
        },
        scripts: {
          dev: 'bun --watch run src/main.ts',
          build: 'bun build src/main.ts',
        },
      },
    },
    template: {
      from: 'bun',
      copy: [['src', 'backend/server/src']],
    },
  })
)
