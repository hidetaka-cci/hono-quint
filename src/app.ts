import { Hono } from 'hono'

export function createApp(initialStock: number) {
    let stock = initialStock
    const reservations = new Map<number, string>()
    const app = new Hono()
    
    // 観測用：在庫数
    app.get('/stock', (c) => c.json({ stock }))

    // 観測用：予約一覧
    app.get('/reservations', (c) =>
        c.json([...reservations].map(([id, user]) => ({ id, user }))),
    )
    return app    
}
