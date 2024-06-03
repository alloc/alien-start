import dedent from 'dedent'
import { loadMixin } from '../../use'
import { defineMixin } from '../mixin'

export default defineMixin(ctx => ({
  name: 'codegentool',
  apply: [
    loadMixin(import('../dev-script')),
    loadMixin(import('../build-script')),
  ],
  files: [
    {
      name: 'scripts/dev/gen.sh',
      content: dedent`
        # Run all generators in watch mode.
        pnpm -s codegentool --watch
      `,
    },
    {
      name: 'scripts/build/pre/gen.sh',
      content: dedent`
        # Run all generators.
        pnpm -s codegentool
      `,
    },
    {
      name: 'generators/package.json',
      content: {
        name: '@' + ctx.pkg.name + '/generators',
        private: true,
      },
    },
  ],
  workspace: {
    packages: ['generators'],
    devDependencies: {
      '@alloc/codegentool': 'latest',
    },
    updatePackage: pkg => {
      pkg.codegentool = {
        generators: ['generators/**/*.{ts,mts,js,mjs}', '!**/node_modules'],
      }
    },
  },
}))
