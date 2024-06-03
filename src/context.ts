import { PackageJson } from 'type-fest'
import { Mixin } from './mixins/mixin'

export interface Context {
  /**
   * The root directory of the project workspace. Before a mixin is applied, the working directory
   * is switched to this with `process.chdir`.
   */
  root: string
  /**
   * The package.json in the workspace's root directory.
   */
  pkg: PackageJson
  /**
   * The commit SHA before any mixins were applied. This is used for reverting a set of chained
   * mixins if one fails.
   */
  commit: string
  /**
   * Only defined if the mixin was called from another mixin. This is the mixin that called it.
   */
  caller?: Mixin
}
