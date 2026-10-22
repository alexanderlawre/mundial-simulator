import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { UCL_STRINGS } from './i18nUcl'

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(jsx?|js)$/.test(name) && !name.includes('.test.') ? [p] : []
  })
}

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

describe('Champions League strings', () => {
  const usedKeys = new Set()
  sourceFiles('src').forEach((file) => {
    for (const m of readFileSync(file, 'utf8').matchAll(/'ucl\.([A-Za-z0-9_]+)'/g)) usedKeys.add(m[1])
  })

  it('defines every key the UI uses in English', () => {
    usedKeys.forEach((k) => expect(UCL_STRINGS.en[k], `missing en ucl.${k}`).toBeTypeOf('string'))
  })

  it('translates every key into all 15 languages with matching placeholders', () => {
    expect(Object.keys(UCL_STRINGS)).toHaveLength(15)
    Object.entries(UCL_STRINGS).forEach(([code, dict]) => {
      expect(Object.keys(dict), code).toEqual(Object.keys(UCL_STRINGS.en))
      Object.entries(dict).forEach(([k, v]) => expect(placeholders(v), `${code}.${k}`).toBe(placeholders(UCL_STRINGS.en[k])))
    })
  })
})
