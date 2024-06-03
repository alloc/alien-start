import { Mixin, defineMixin } from '../mixin'

export default defineMixin((ctx): Mixin | null => {
  if (ctx.pkg.scripts?.prepare?.includes('alien-start run prepare')) {
    return null
  }

  return {
    name: 'prepare-script',
    workspace: {
      scripts: {
        prepare: 'alien-start run prepare',
      },
    },
  }
})
