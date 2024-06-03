export function generateImports(imports: Record<string, Set<string>>) {
  return Object.entries(imports)
    .map(([from, names]) => {
      return `import { ${[...names].join(', ')} } from '${from}'`
    })
    .join('\n')
}
