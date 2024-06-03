import fs from 'fs'
import path from 'path'
import { PackageJson } from 'type-fest'

export function readPackageData(dir = process.cwd()): PackageJson {
  const file = dir.endsWith('package.json')
    ? dir
    : path.join(dir, 'package.json')

  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

export async function writePackageData(pkg: PackageJson, dir = process.cwd()) {
  const file = dir.endsWith('package.json')
    ? dir
    : path.join(dir, 'package.json')

  const prettier = await import('prettier')
  const config = await prettier.resolveConfig(file)
  fs.writeFileSync(
    file,
    await prettier.format(JSON.stringify(pkg, null, 2), {
      ...config,
      parser: 'json',
    })
  )
}

export function mergePackageData(
  pkg: PackageJson,
  data: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
  }
) {
  if (data.dependencies) {
    pkg.dependencies = sortObjectKeys({
      ...pkg.dependencies,
      ...data.dependencies,
    })
  }
  if (data.devDependencies) {
    pkg.devDependencies = sortObjectKeys({
      ...pkg.devDependencies,
      ...data.devDependencies,
    })
  }
  if (data.scripts) {
    pkg.scripts = {
      ...pkg.scripts,
      ...data.scripts,
    }
  }
}

function sortObjectKeys<T>(obj: T): T
function sortObjectKeys(obj: any) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {} as any)
}
