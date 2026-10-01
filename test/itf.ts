// ITF（Informal Trace Format）の値を素の JS 値に戻す
export type Value =
  | bigint | string | boolean
  | Value[]
  | Map<Value, Value>
  | Set<Value>
  | { tag: string; value: Value }
  | { [key: string]: Value }

export function decode(v: unknown): Value {
  if (typeof v === 'string' || typeof v === 'boolean') return v
  if (typeof v === 'number') return BigInt(v)
  if (Array.isArray(v)) return v.map(decode)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('#bigint' in o) return BigInt(o['#bigint'] as string)
    if ('#tup' in o) return (o['#tup'] as unknown[]).map(decode)
    if ('#set' in o) return new Set((o['#set'] as unknown[]).map(decode))
    if ('#map' in o) {
      return new Map(
        (o['#map'] as [unknown, unknown][]).map(([k, val]) => [decode(k), decode(val)]),
      )
    }
    const out: Record<string, Value> = {}
    for (const [k, val] of Object.entries(o)) {
      if (k.startsWith('#')) continue // #meta などは捨てる
      out[k] = decode(val)
    }
    return out
  }
  throw new Error(`unknown ITF value: ${JSON.stringify(v)}`)
}