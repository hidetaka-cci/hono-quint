import { Hono } from 'hono'

export function createApp(initialStock: number) {
    let stock = initialStock
    let nextId = 1
    const reservations = new Map<number, string>()
  
    const app = new Hono()
  
    // 予約する
    app.post('/reservations', async (c) => {
      const { user } = await c.req.json<{ user: string }>()
      if (stock <= 0) {
        return c.json({ error: 'out of stock' }, 409)
      }
      const id = nextId++
      reservations.set(id, user)
      stock--
      return c.json({ id, user }, 201)
    })
  
    // 予約を取り消す
    app.delete('/reservations/:id', (c) => {
      const id = Number(c.req.param('id'))
      if (!reservations.has(id)) {
        return c.json({ error: 'not found' }, 404)
      }
      reservations.delete(id)
      stock++
      return c.body(null, 204)
    })
  
    // 観測用：在庫数
    app.get('/stock', (c) => c.json({ stock }))
  
    // 観測用：予約一覧
    app.get('/reservations', (c) =>
      c.json([...reservations].map(([id, user]) => ({ id, user }))),
    )
      
    return app    
}
