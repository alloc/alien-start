import { MixinModule } from './mixin'

export default [
  {
    title: 'Bun API Server',
    url: 'https://bun.sh/docs',
    import: () => import('./bun-api'),
  },
  {
    title: 'alien-router',
    url: 'https://github.com/alloc/alien-dom/tree/beta/packages/router',
    import: () => import('./alien-router'),
  },
  {
    title: 'UnoCSS',
    url: 'https://unocss.dev/guide/',
    import: () => import('./unocss'),
  },
  {
    title: 'Postgres',
    url: 'https://www.postgresql.org/about/',
    import: () => import('./postgres'),
  },
  {
    title: 'CockroachDB',
    url: 'https://www.cockroachlabs.com/docs/stable/frequently-asked-questions',
    import: () => import('./cockroachdb'),
  },
  {
    title: 'Terraform',
    url: 'https://developer.hashicorp.com/terraform/intro',
    import: () => import('./terraform'),
  },
  // { title: 'alien-rpc', import: () => import('./alien-rpc') },
  // { title: 'Tauri', import: () => import('./tauri') },
] satisfies MixinModule[]
