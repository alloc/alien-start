import { $, execa } from 'execa'
import { readFileSync, writeFileSync } from 'fs'
import { bold, cyan, green, yellow } from 'kleur/colors'
import prompts from 'prompts'
import { PackageJson } from 'type-fest'
import { expectCleanRepo, gitCommitAll } from './util/git'
import { fatal, info } from './util/log'
import { readPackageData, writePackageData } from './util/package'
import { which, whichRequire } from './util/which'

export async function init() {
  await expectCleanRepo()

  let skipRename = false
  if (!(await which('rg'))) {
    info(
      `Please install ${bold('ripgrep')} with ${cyan('`brew install ripgrep`')} if you want to rename your project.\n`
    )

    const ctrl = new AbortController()
    const { skip } = await Promise.race([
      prompts({
        name: 'skip',
        type: 'confirm',
        message: 'Do you want to skip renaming your project?',
      }),
      // Check if `rg` is installed every second.
      whichRequire('rg', 1000, ctrl.signal).then(() => ({ skip: false })),
    ])

    if (skip == null) {
      process.exit()
    }

    ctrl.abort()
    skipRename = skip === true
  }

  const pkg = readPackageData()
  let pkgChanged = false

  if (!skipRename) {
    if (!pkg.name) {
      fatal('Package "name" is missing from package.json')
    }

    let { name } = await prompts({
      name: 'name',
      type: 'text',
      message: 'Project name (kebab-cased)',
    })

    if (name == null) {
      process.exit()
    }

    name = name.toLowerCase().replace(/\s/g, '-')
    await findAndReplace(pkg.name, name)

    pkg.name = name
    pkgChanged = true
  }

  const utilityLibInstalled = await installUtilityLib(pkg)
  if (utilityLibInstalled) {
    pkgChanged = true
  }

  if (pkgChanged) {
    await writePackageData(pkg)
  }

  info('\nPinning dependencies to current major versions...')
  await execa('pnpm', ['-r', 'up', '-L'], { stdio: 'inherit' })

  await gitCommitAll('chore: initialize project with alien-start')

  info('\nProject initialized successfully!')
}

async function findAndReplace(pattern: string, replacement: string) {
  const { stdout } = await $`rg --vimgrep ${pattern}`

  const matches: Record<string, number[]> = {}
  for (const range of stdout.split('\n')) {
    const [file, line] = range.split(':')
    matches[file] ||= []
    matches[file].push(Number(line))
  }

  for (const file in matches) {
    let lines = readFileSync(file, 'utf8').split('\n')
    for (const match of matches[file]) {
      lines[match] = lines[match].replace(new RegExp(pattern, 'g'), replacement)
    }
    writeFileSync(file, lines.join('\n'))
    info(
      `Found and replaced ${yellow(pattern)} with ${green(replacement)} in ${file}`
    )
  }
}

async function installUtilityLib(pkg: PackageJson) {
  const { selection }: { selection: Record<string, string> } = await prompts({
    name: 'selection',
    type: 'select',
    message: 'Want to use a utility library?',
    choices: [
      {
        title: 'No thanks',
        value: {},
      },
      {
        title: 'Radash',
        description: 'https://radash-docs.vercel.app/docs/getting-started',
        value: { radash: 'latest' },
      },
      {
        title: 'fp-ts',
        description: 'https://gcanti.github.io/fp-ts/',
        value: { 'fp-ts': 'latest' },
      },
      {
        title: 'Lodash',
        description: '(lodash-es) https://lodash.com/',
        value: { lodash: 'npm:lodash-es' },
      },
    ],
  })

  if (selection == null) {
    process.exit()
  }

  for (const key in selection) {
    pkg.dependencies![key] = selection[key]
  }

  return Object.keys(selection).length > 0
}
