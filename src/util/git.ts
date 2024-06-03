import { $, execa } from 'execa'
import { fatal, info } from './log'

export async function gitCommitAll(message: string) {
  info('\nSaving changes...')
  await $`git add .`
  await execa('git', ['commit', '-m', message], { stdio: 'inherit' })
}

export async function gitResetHard(commit?: string) {
  info('\nReverting changes...')
  await execa('git', ['reset', '--hard', commit ?? 'HEAD'], {
    stdio: 'inherit',
  })
  await execa('git', ['clean', '-df'], { stdio: 'inherit' })
}

export async function gitHead() {
  return (await execa('git', ['rev-parse', 'HEAD'])).stdout
}

export async function expectCleanRepo() {
  const { stdout } = await $`git status --porcelain`
  if (stdout.trim()) {
    fatal(
      'Please commit or stash your changes before running "alien-start use".'
    )
  }
}
