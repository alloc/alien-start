import { spawn } from 'child_process'
import { execa } from 'execa'
import fs from 'fs'
import { blue, cyan, green, magenta, yellow } from 'kleur/colors'
import path from 'path'

const colors = [yellow, green, blue, cyan, magenta]
let nextColor = 0

export async function runScripts(
  root: string,
  options: {
    parallel?: boolean
  } = {}
) {
  const isDirectory = (path: fs.PathLike) => {
    try {
      return fs.statSync(path).isDirectory()
    } catch (e) {
      return false
    }
  }

  if (isDirectory(root)) {
    const promises: Promise<any>[] = []

    for (let file of fs.readdirSync(root)) {
      const ext = path.extname(file)
      const name = path.basename(file, ext)
      const logPrefix =
        name !== 'pnpm' ? colors[nextColor++](name) + ': ' : null

      file = path.join(root, file)
      if (isDirectory(file)) {
        continue
      }

      const isExecutable =
        readFirstBytes(file, 2) === '#!' &&
        (fs.statSync(file).mode & 0o111) !== 0

      const cmd = isExecutable
        ? file
        : (/\.m?js$/.test(ext) && 'node') ||
          (ext === '.bash' && 'bash') ||
          (ext === '.sh' && 'sh') ||
          null

      if (cmd) {
        const argv = isExecutable ? [] : [file]

        if (options.parallel) {
          if (logPrefix) {
            const child = spawn(cmd, argv, { stdio: 'pipe' })
            child.stdout.setEncoding('utf-8')
            child.stdout.on('data', (data: string) => {
              process.stdout.write(
                data.trimEnd().replace(/^/gm, logPrefix) + '\n'
              )
            })
            child.stderr.setEncoding('utf-8')
            child.stderr.on('data', (data: string) => {
              process.stderr.write(data.replace(/^/gm, logPrefix))
            })
            promises.push(
              new Promise<void>((resolve, reject) => {
                child.on('exit', code => {
                  if (code === 0) {
                    resolve()
                  } else {
                    reject()
                  }
                })
              })
            )
          } else {
            promises.push(execa(cmd, argv, { stdio: 'inherit' }))
          }
        } else {
          try {
            await execa(cmd, argv, { stdio: 'inherit' })
          } catch {
            process.exit(1)
          }
        }
      }
    }

    if (options.parallel) {
      try {
        await Promise.all(promises)
      } catch {
        process.exit(1)
      }
    }
  }
}

function readFirstBytes(
  file: string,
  bytes: number,
  encoding?: BufferEncoding
) {
  const buffer = Buffer.alloc(bytes)
  fs.readSync(fs.openSync(file, 'r'), buffer, 0, bytes, 0)
  return buffer.toString(encoding)
}
