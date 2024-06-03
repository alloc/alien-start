import { cyan, red } from 'kleur/colors'

export function info(msg?: string) {
  msg != null && console.log(msg.replace(/^(.+)/gm, cyan('info') + ' $1'))
}

export function error(msg: string) {
  console.error(msg.replace(/^(.+)/gm, red('error') + ' $1'))
}

export function fatal(msg: string): never {
  error(msg)
  process.exit(1)
}
