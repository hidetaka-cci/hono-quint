import { Hono } from 'hono'

export function createApp(initialStock: number) {
    const app = new Hono()
    
    app.get('/', (c) => {
      return c.text('Hello Hono!')
    })
    return app    
}
