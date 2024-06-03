import { defineConfig } from 'tsup'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
})
