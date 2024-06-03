import { runScripts } from './run'

export async function runDevScripts() {
  await runScripts('scripts/dev/pre')
  await runScripts('scripts/dev', { parallel: true })
}
