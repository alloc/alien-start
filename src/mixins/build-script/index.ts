import dedent from 'dedent'
import { Mixin, defineMixin } from '../mixin'

export default defineMixin((ctx): Mixin | null => {
  if (ctx.pkg.scripts?.build?.includes('alien-start run build')) {
    return null
  }

  return {
    name: 'build-script',
    workspace: {
      scripts: {
        build: 'alien-start run build',
      },
    },
    files: [
      {
        name: 'scripts/build/pnpm.sh',
        content: dedent`
          # Run the build script of each package in the workspace (in topological order).
          pnpm multi run build
        `,
      },
    ],
  }
})
