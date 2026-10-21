import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const sql = readFileSync(resolve(__dirname, '../supabase/migrations/024_client_manage_token.sql'), 'utf8')
const executable = sql
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')

describe('migration 024 - client manage token', () => {
  it('stores only an integer version, never the token / its hash / the secret', () => {
    const addedColumns = [...executable.matchAll(/ADD COLUMN IF NOT EXISTS\s+(\w+)\s+([\w ]+?)(?:\s+NOT NULL|\s+DEFAULT|,|;)/g)].map(
      (match) => [match[1], match[2].trim()]
    )

    expect(addedColumns).toContainEqual(['manage_token_version', 'integer'])
    const tokenLike = addedColumns.filter(([name]) => /token|hash|secret|mac/i.test(name) && name !== 'manage_token_version')
    expect(tokenLike).toEqual([])
  })

  it('adds the cancellation audit columns with a client|owner check', () => {
    expect(executable).toMatch(/cancelled_at\s+timestamptz/)
    expect(executable).toMatch(/cancelled_by\s+text/)
    expect(executable).toMatch(/cancelled_by IN \('client', 'owner'\)/)
  })

  it('defaults existing rows to version 1 so current links are valid right away', () => {
    expect(executable).toMatch(/manage_token_version integer NOT NULL DEFAULT 1/)
  })
})
