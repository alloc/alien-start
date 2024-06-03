import dedent from 'dedent'
import { Project } from 'ts-morph'
import { test } from 'vitest'
import { addVitePlugins } from './vite'

test('basic defineConfig with empty plugins array', async t => {
  const project = new Project()
  project.createSourceFile(
    'vite.config.ts',
    dedent`
      import { defineConfig } from 'vite'
      export default defineConfig({ plugins: [] })
    `
  )

  const result = await addVitePlugins(project, [
    {
      import: 'foo from "vite-plugin-foo"',
      create: 'foo()',
    },
  ])

  t.expect(result).toMatchInlineSnapshot(`
    "import { defineConfig } from 'vite'
    import foo from 'vite-plugin-foo'

    export default defineConfig({ plugins: [foo()] })
    "
  `)
})

test('basic defineConfig with non-empty plugins array', async t => {
  const project = new Project()
  project.createSourceFile(
    'vite.config.ts',
    dedent`
      import { defineConfig } from 'vite'

      import foo from "vite-plugin-foo"
      
      export default defineConfig({
        plugins: [
          foo(),
        ],
      })
    `
  )

  const result = await addVitePlugins(project, [
    {
      import: 'bar from "vite-plugin-bar"',
      create: 'bar()',
    },
  ])

  t.expect(result).toMatchInlineSnapshot(`
    "import { defineConfig } from 'vite'

    import foo from 'vite-plugin-foo'
    import bar from 'vite-plugin-bar'

    export default defineConfig({
      plugins: [foo(), bar()],
    })
    "
  `)
})

test('defineConfig with function argument', async t => {
  const project = new Project()
  project.createSourceFile(
    'vite.config.ts',
    dedent`
      import { defineConfig } from 'vite'

      export default defineConfig(() => {
        return {
          plugins: [],
        }
      })
    `
  )

  const result = await addVitePlugins(project, [
    {
      import: 'foo from "vite-plugin-foo"',
      create: 'foo()',
    },
  ])

  t.expect(result).toMatchInlineSnapshot(`
    "import { defineConfig } from 'vite'
    import foo from 'vite-plugin-foo'

    export default defineConfig(() => {
      return {
        plugins: [foo()],
      }
    })
    "
  `)
})

test('defineConfig with one-liner arrow function', async t => {
  const project = new Project()
  project.createSourceFile(
    'vite.config.ts',
    dedent`
      import { defineConfig } from 'vite'

      export default defineConfig(() => ({
        plugins: [],
      }))
    `
  )

  const result = await addVitePlugins(project, [
    {
      import: 'foo from "vite-plugin-foo"',
      create: 'foo()',
    },
  ])

  t.expect(result).toMatchInlineSnapshot(`
    "import { defineConfig } from 'vite'
    import foo from 'vite-plugin-foo'

    export default defineConfig(() => ({
      plugins: [foo()],
    }))
    "
  `)
})
