import { defineRoute } from '@alien-dom/router'

export default defineRoute({
  path: '/*',
  title: 'Page Not Found',
  component: function DefaultRoute() {
    return (
      <div>
        <h1>404</h1>
        <p>Page not found</p>
      </div>
    )
  },
})
