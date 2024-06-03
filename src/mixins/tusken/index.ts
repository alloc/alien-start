import { existsSync } from 'fs'
import { resolveOptions } from '../../util/options'
import { Mixin, defineMixin } from '../mixin'

const providers = {
  postgres: {
    title: 'Postgres',
    import: () => import('../postgres'),
    exists: existsSync('terraform/dev/postgres.tf'),
  },
  cockroachdb: {
    title: 'CockroachDB',
    import: () => import('../cockroachdb'),
    exists: existsSync('terraform/dev/cockroachdb.tf'),
  },
}

type ProviderKey = keyof typeof providers

export type Options = {
  provider?: ProviderKey | 'none'
}

export default defineMixin<Options>(async (_ctx, options): Promise<Mixin> => {
  const providerKeys = Object.keys(providers) as ProviderKey[]
  options.provider ??= providerKeys.find(key => providers[key].exists)

  await resolveOptions(options, {
    provider: {
      type: 'select',
      message: 'Which database provider would you like to use?',
      choices: [
        ...providerKeys.map(key => {
          return {
            title: providers[key].title,
            value: key,
          }
        }),
        {
          title: 'None',
          value: 'none',
        },
      ],
    },
  })

  const providerModule =
    options.provider !== 'none'
      ? await providers[options.provider!].import()
      : undefined

  return {
    name: 'tusken',
    apply: providerModule ? [providerModule.default()] : [],
    packages: {
      'backend/server': {
        dependencies: {
          pg: '8',
          tusken: 'alpha',
        },
      },
    },
    workspace: {
      devDependencies: {
        '@tusken/cli': 'alpha',
      },
    },
  }
})
