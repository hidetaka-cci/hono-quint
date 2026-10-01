export type ReserveResult = { kind: 'reserved'; id: number } | { kind: 'soldOut' }
export type CancelResult = { kind: 'cancelled' } | { kind: 'notFound' }

export class Inventory {
  private stock: number
  private nextId = 1
  private readonly reservations = new Map<number, string>()

  constructor(initialStock: number) {
    this.stock = initialStock
  }
  // 予約する
  reserve(user: string): ReserveResult {
    if (this.stock <= 0) {
      return { kind: 'soldOut' }
    }
    const id = this.nextId++
    this.reservations.set(id, user)
    this.stock--
    return { kind: 'reserved', id }
  }
  // 予約を取り消す
  cancel(id: number): CancelResult {
    if (!this.reservations.has(id)) {
      return { kind: 'notFound' }
    }
    this.reservations.delete(id)
    this.stock++
    return { kind: 'cancelled' }
  }

  // テストから内部状態を観測するための読み取り口
  snapshot() {
    return {
      stock: this.stock,
      nextId: this.nextId,
      reservations: new Map(this.reservations),
    }
  }
}