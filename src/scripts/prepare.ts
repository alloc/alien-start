import { runScripts } from './run'

export async function runPrepareScripts() {
  await runScripts('scripts/prepare/pre')
  await runScripts('scripts/prepare')
  await runScripts('scripts/prepare/post')
}
