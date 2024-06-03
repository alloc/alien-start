import { $ } from 'execa'

export async function which(command: string) {
  try {
    return (await $`which ${command}`).stdout
  } catch {
    return null
  }
}

/**
 * Call `which` in a loop until it exists or the signal is aborted.
 */
export async function whichRequire(
  command: string,
  interval: number,
  signal?: AbortSignal
) {
  while (!signal || !signal.aborted) {
    if (await which(command)) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}
