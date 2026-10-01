import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { createApp } from '../src/app'
import { decode } from './itf'

// ---------- 1. Quint にトレースを生成させる ----------
const N_TRACES = 20
const SEED = process.env.QUINT_SEED ?? '42'
const outDir = mkdtempSync(join(tmpdir(), 'quint-traces-'))

execFileSync('npx', [
  'quint', 'run', 'spec/reservation.qnt',
  '--backend', 'typescript',
  '--max-steps', '15',
  '--n-traces', String(N_TRACES),
  '--max-samples', String(N_TRACES),
  '--seed', SEED,
  '--invariants', 'stockNeverNegative', 'stockIsConserved',
  '--out-itf', join(outDir, 'trace_{seq}.itf.json'),
], { stdio: 'pipe' })

// ---------- 2. 仕様の状態の型 ----------
type SpecState = {
  stock: bigint
  reservations: Map<bigint, string>
  nextId: bigint
  lastRequest: { tag: 'Start' | 'Reserve' | 'Cancel'; value: unknown }
  lastStatus: bigint
}

const traceFiles = readdirSync(outDir).filter((f) => f.endsWith('.itf.json')).sort()

// ---------- 3. トレースを 1 本ずつ Hono アプリに再生する ----------
describe('reservation API conforms to Quint spec', () => {
  test('traces were generated', () => {
    expect(traceFiles.length).toBe(N_TRACES)
  })

  for (const file of traceFiles) {
    test(`replay ${file} (seed=${SEED})`, async () => {
      const trace = JSON.parse(readFileSync(join(outDir, file), 'utf8'))
      const states = trace.states.map(decode) as SpecState[]

      const app = createApp(Number(states[0].stock)) // 初期状態から実装を作る

      for (const [i, s] of states.entries()) {
        const req = s.lastRequest

        // (a) 仕様が受けたリクエストを、そのまま API に送る
        let res: Response | undefined
        if (req.tag === 'Reserve') {
          res = await app.request('/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: req.value }),
          })
        } else if (req.tag === 'Cancel') {
          res = await app.request(`/reservations/${req.value}`, { method: 'DELETE' })
        }

        // (b) ステータスが仕様と一致するか
        if (res) {
          expect(res.status, `step ${i}: ${req.tag}(${req.value})`).toBe(Number(s.lastStatus))
        }

        // (c) 観測できる状態が仕様と一致するか
        const stock = (await (await app.request('/stock')).json()).stock
        expect(stock, `step ${i}: stock`).toBe(Number(s.stock))

        const list = (await (await app.request('/reservations')).json()) as { id: number; user: string }[]
        const expected = [...s.reservations]
          .map(([id, user]) => ({ id: Number(id), user }))
          .sort((a, b) => a.id - b.id)
        expect(list.sort((a, b) => a.id - b.id), `step ${i}: reservations`).toEqual(expected)
      }
    })
  }
})