import dedent from 'dedent'
import { Mixin, defineMixin } from '../mixin'

export default defineMixin((ctx): Mixin | null => {
  if (ctx.pkg.scripts?.dev?.includes('alien-start run dev')) {
    return null
  }

  return {
    name: 'dev-script',
    workspace: {
      scripts: {
        dev: 'alien-start run dev',
      },
    },
    files: [
      {
        name: 'scripts/dev/pnpm.sh',
        content: dedent`
          # Run the dev script of each package in the workspace.
          pnpm --parallel run dev
        `,
      },
    ],
  }
})
