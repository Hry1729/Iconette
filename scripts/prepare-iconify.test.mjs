import assert from 'node:assert/strict'
import test from 'node:test'
import { diffCatalog, formatEntry, hasCatalogDelta, insertChangelog, stable } from './prepare-iconify.mjs'

test('键顺序不同不算元数据变化', () => {
  const a = { mdi: { name: 'M', total: 3, samples: ['a'] } }
  const b = { mdi: { samples: ['a'], total: 3, name: 'M' } }
  const d = diffCatalog(a, b)
  assert.equal(d.added.length, 0)
  assert.equal(d.removed.length, 0)
  assert.equal(d.updated.length, 0)
  assert.equal(d.meta.length, 0)
  assert.equal(hasCatalogDelta(d, '1', '1'), false)
})

test('新增、移除和数量变化', () => {
  const d = diffCatalog(
    { mdi: { total: 10, name: 'M' }, old: { total: 1, name: 'O' } },
    { mdi: { total: 12, name: 'M' }, neo: { total: 2, name: 'N' } },
  )
  assert.deepEqual(d.added, ['neo'])
  assert.deepEqual(d.removed, ['old'])
  assert.deepEqual(d.updated, [{ prefix: 'mdi', from: 10, to: 12 }])
  assert.equal(d.prevCount, 2)
  assert.equal(d.nextCount, 2)
  const text = formatEntry(d, '2026-10-31', '2.2.1', '2.2.2')
  assert.match(text, /## \[2026-10-31\] Iconify 目录/)
  assert.match(text, /2\.2\.1 → 2\.2\.2/)
  assert.match(text, /`neo`/)
  assert.match(text, /`old`/)
  assert.match(text, /`mdi` 10 → 12/)
})

test('只改名称算其他元数据', () => {
  const d = diffCatalog({ mdi: { total: 1, name: 'A' } }, { mdi: { total: 1, name: 'B' } })
  assert.deepEqual(d.meta, ['mdi'])
  assert.equal(d.updated.length, 0)
})

test('变更插在 Unreleased 之后', () => {
  const md = '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- 离线目录\n\n## [2026-01-01] 旧\n\n- 旧记录\n'
  const out = insertChangelog(md, '## [2026-10-31] Iconify 目录\n\n- 合计：1 → 2\n')
  const u = out.indexOf('## [Unreleased]')
  const n = out.indexOf('## [2026-10-31]')
  const o = out.indexOf('## [2026-01-01]')
  assert.ok(u >= 0 && u < n && n < o)
  assert.match(out, /离线目录/)
  assert.match(out, /旧记录/)
})

test('stable 与键顺序无关', () => {
  assert.equal(stable({ b: 1, a: { d: 1, c: 2 } }), stable({ a: { c: 2, d: 1 }, b: 1 }))
})
