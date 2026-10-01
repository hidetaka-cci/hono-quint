// test/inventory.mbt.test.ts
import { describe, expect, test } from 'vitest'
import { Inventory } from '../src/inventory'
import { generateTraces, type SpecState } from './traces'

const N_TRACES = 20
const SEED = process.env.QUINT_SEED ?? '42'
const traces = generateTraces(N_TRACES, SEED)

// 仕様の lastStatus（HTTP ステータス）を、ドメイン層の結果の種別に読み替える
const KIND_OF_STATUS: Record<number, string> = {
  201: 'reserved',
  409: 'soldOut',
  204: 'cancelled',
  404: 'notFound',
}

// 仕様の状態を、Inventory.snapshot() と同じ形に変換する
function expectedSnapshot(s: SpecState) {
  return {
    stock: Number(s.stock),
    nextId: Number(s.nextId),
    reservations: new Map([...s.reservations].map(([id, user]) => [Number(id), user])),
  }
}

describe('Inventory conforms to Quint spec', () => {
  test('traces were generated', () => {
    expect(traces.length).toBe(N_TRACES)
  })

  for (const { file, states } of traces) {
    test(`replay ${file} (seed=${SEED})`, () => {
      const inventory = new Inventory(Number(states[0].stock))
      expect(inventory.snapshot(), 'step 0: snapshot').toEqual(expectedSnapshot(states[0]))

      for (let i = 1; i < states.length; i++) {
        const prev = states[i - 1]
        const s = states[i]
        const req = s.lastRequest
        const label = `step ${i}: ${req.tag}(${req.value})`

        // (a) 仕様が受けた操作を、そのままメソッドとして呼ぶ
        const result =
          req.tag === 'Reserve'
            ? inventory.reserve(req.value as string)
            : inventory.cancel(Number(req.value))

        // (b) 結果の種別が仕様と一致するか
        expect(result.kind, label).toBe(KIND_OF_STATUS[Number(s.lastStatus)])

        // (c) 払い出された予約 ID が、仕様の採番と一致するか
        if (result.kind === 'reserved') {
          expect(result.id, `${label}: id`).toBe(Number(prev.nextId))
        }

        // (d) 内部状態が仕様の状態と一致するか（nextId も直接比べられる）
        expect(inventory.snapshot(), `${label}: snapshot`).toEqual(expectedSnapshot(s))
      }
    })
  }
})