import { defineRoute } from '@alien-dom/router'

export default defineRoute({
  path: '/',
  title: 'Welcome',
  component: function HomeRoute() {
    return (
      <div>
        <h1>Welcome</h1>
        <p>This is my website</p>
      </div>
    )
  },
})
