
import { Hono } from 'hono'
import { Inventory } from './inventory'

export function createApp(initialStock: number) {
  const inventory = new Inventory(initialStock)

  const app = new Hono()

  // 予約する
  app.post('/reservations', async (c) => {
    const { user } = await c.req.json<{ user: string }>()
    const result = inventory.reserve(user)
    if (result.kind === 'soldOut') {
      return c.json({ error: 'out of stock' }, 409)
    }
    return c.json({ id: result.id, user }, 201)
  })

  // 予約を取り消す
  app.delete('/reservations/:id', (c) => {
    const id = Number(c.req.param('id'))
    const result = inventory.cancel(id)
    if (result.kind === 'notFound') {
      return c.json({ error: 'not found' }, 404)
    }
    return c.body(null, 204)
  })

  // 観測用：在庫数
  app.get('/stock', (c) => c.json({ stock: inventory.snapshot().stock }))

  // 観測用：予約一覧
  app.get('/reservations', (c) =>
    c.json([...inventory.snapshot().reservations].map(([id, user]) => ({ id, user }))),
  )

  return app
}