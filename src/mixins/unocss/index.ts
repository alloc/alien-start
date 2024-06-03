import dedent from 'dedent'
import { format as ago } from 'timeago.js'
import { info } from '../../util/log'
import { resolveOptions } from '../../util/options'
import { Mixin, defineMixin } from '../mixin'

export type Options = {
  /** @default ["** /*.{tsx,jsx,html}"] */
  include?: string[]
  presets?: string[]
}

export default defineMixin<Options>(async (_ctx, options): Promise<Mixin> => {
  const foundPresets = await npmSearch('unocss-preset')

  await resolveOptions(options, {
    presets: {
      type: 'autocompleteMultiselect',
      message: 'Select UnoCSS presets',
      choices: foundPresets
        .filter(
          result =>
            result.score.detail.popularity > 0.014 &&
            (result.package.links.homepage || result.package.links.repository)
        )
        .sort((a, b) => b.score.detail.popularity - a.score.detail.popularity)
        .map(result => {
          return {
            value: result.package.name,
            title:
              result.package.name +
              `@${result.package.version} by ${result.package.publisher.username} [${ago(result.package.date)}]`,
            description:
              (!/[\[#]/.test(result.package.description)
                ? result.package.description + '\n'
                : '') +
              (result.package.links.homepage ||
                result.package.links.repository),
          }
        }),
    },
  })

  const imports = [`import { defineConfig } from '@unocss/vite'`]
  const presets = options.presets
    ?.map(preset => {
      const ident = preset
        .replace(/@[^/]+\//, '')
        .replace(/(unocss|preset)[-/]/g, '')
        .replace(/[-/](\w)/g, (_, c) => c.toUpperCase())

      imports.push(`import ${ident} from '${preset}'`)
      return ident + '()'
    })
    .join(', ')

  if (presets) {
    info(
      "Please check your presets in `unocss.config.ts` to make sure they're fully configured."
    )
  }

  const include =
    options.include?.map(p => JSON.stringify(p)).join(', ') ??
    `'**/*.{tsx,jsx,html}'`

  let config = dedent`
    ${imports.join('\n')}

    export default defineConfig({
      include: [${include}],${presets ? `\n  presets: [${presets}],` : ''}
    })
  `

  return {
    name: 'unocss',
    packages: {
      web: {
        devDependencies: {
          '@unocss/vite': '*',
        },
      },
    },
    vite: {
      plugins: [
        {
          import: `unocssPlugin from "@unocss/vite"`,
          create: `unocssPlugin()`,
        },
      ],
    },
    files: [
      {
        name: 'unocss.config.ts',
        content: config,
      },
    ],
  }
})

async function npmSearch(query: string) {
  const response = await fetch(
    `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(query)}&size=100`
  )
  const data: any = await response.json()
  return data.objects as {
    flags: {
      insecure: number
      unstable: boolean
    }
    package: {
      author: {
        email: string
        name: string
        username: string
      }
      date: string
      description: string
      keywords: Array<string>
      links: {
        bugs: string
        homepage: string
        npm: string
        repository: string
      }
      maintainers: Array<{
        email: string
        username: string
      }>
      name: string
      publisher: {
        email: string
        username: string
      }
      scope: string
      version: string
    }
    score: {
      detail: {
        maintenance: number
        popularity: number
        quality: number
      }
      final: number
    }
    searchScore: number
  }[]
}
