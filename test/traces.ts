import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decode } from './itf'

// 仕様（spec/reservation.qnt）の状態の型
export type SpecState = {
  stock: bigint
  reservations: Map<bigint, string>
  nextId: bigint
  lastRequest: { tag: 'Start' | 'Reserve' | 'Cancel'; value: unknown }
  lastStatus: bigint
}

export type Trace = { file: string; states: SpecState[] }

// quint run でトレースを生成し、デコード済みの状態列として返す
export function generateTraces(nTraces: number, seed: string): Trace[] {
  const outDir = mkdtempSync(join(tmpdir(), 'quint-traces-'))
  execFileSync('npx', [
    'quint', 'run', 'spec/reservation.qnt',
    '--backend', 'typescript',
    '--max-steps', '15',
    '--n-traces', String(nTraces),
    '--max-samples', String(nTraces),
    '--seed', seed,
    '--invariants', 'stockNeverNegative', 'stockIsConserved',
    '--out-itf', join(outDir, 'trace_{seq}.itf.json'),
  ], { stdio: 'pipe' })

  return readdirSync(outDir)
    .filter((f) => f.endsWith('.itf.json'))
    .sort()
    .map((file) => {
      const json = JSON.parse(readFileSync(join(outDir, file), 'utf8'))
      return { file, states: json.states.map(decode) as SpecState[] }
    })
}