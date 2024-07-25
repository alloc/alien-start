import dedent from 'dedent'
import { defineMixin } from '../mixin'

export default defineMixin(ctx => ({
  name: 'eslint',
  files: [
    {
      name: 'eslint.config.ts',
      content: dedent`
      `,
    },
  ],
  workspace: {
    devDependencies: {
      eslint: 'latest',
    },
  },
}))
