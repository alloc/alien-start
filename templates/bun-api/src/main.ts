import serve from '@hattip/adapter-bun'
import handler from './handler'

Bun.serve(serve(handler))
