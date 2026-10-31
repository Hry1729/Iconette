#!/usr/bin/env node
/**
 * 从 @iconify/json 生成本地图标集目录和样例，并把目录差异写入 CHANGELOG.md。
 * 用法：pnpm sync:iconify
 *
 * 对应 Icônes 的 scripts/prepare.ts：只提交元数据和每套少量样例，
 * 不把 json/ 下的完整 SVG（约数百 MB）写进仓库。
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgDir = path.join(root, 'node_modules/@iconify/json')
const outDir = path.join(root, 'src/data')
const catalogPath = path.join(outDir, 'iconify-collections.json')
const samplesPath = path.join(outDir, 'iconify-samples.json')
const metaPath = path.join(outDir, 'iconify-meta.json')
const changelogPath = path.join(root, 'CHANGELOG.md')

const SAMPLE_CAP = 6
/** 单枚样例超过这个长度就跳过，避免表情集把提交体积撑大。 */
const SAMPLE_BODY_MAX = 48_000

/** 稳定序列化，避免键顺序造成假差异。 */
export function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`
}

/**
 * @param {Record<string, { total?: number }>} prev
 * @param {Record<string, { total?: number }>} next
 */
export function diffCatalog(prev, next) {
  const added = []
  const removed = []
  const updated = []
  const meta = []
  const prevKeys = new Set(Object.keys(prev))
  const nextKeys = new Set(Object.keys(next))
  for (const k of [...nextKeys].sort()) {
    if (!prevKeys.has(k)) added.push(k)
    else if ((prev[k]?.total ?? null) !== (next[k]?.total ?? null)) {
      updated.push({ prefix: k, from: prev[k]?.total ?? null, to: next[k]?.total ?? null })
    }
    else if (stable(prev[k]) !== stable(next[k])) meta.push(k)
  }
  for (const k of [...prevKeys].sort()) if (!nextKeys.has(k)) removed.push(k)
  return { added, removed, updated, meta, prevCount: prevKeys.size, nextCount: nextKeys.size }
}

export function hasCatalogDelta(delta, fromVer, toVer) {
  return Boolean(delta.added.length || delta.removed.length || delta.updated.length || delta.meta.length || (fromVer && toVer && fromVer !== toVer))
}

function tick(list) {
  return list.map(p => `\`${p}\``).join('、')
}

/** Keep a Changelog 风格的一节。 */
export function formatEntry(delta, date, fromVer, toVer, extraLines = []) {
  const lines = [`## [${date}] Iconify 目录`, '']
  if (fromVer && toVer && fromVer !== toVer) lines.push(`- 来源：\`@iconify/json\` ${fromVer} → ${toVer}`)
  else if (toVer) lines.push(`- 来源：\`@iconify/json\` ${toVer}`)
  if (delta.prevCount !== delta.nextCount) lines.push(`- 合计：${delta.prevCount} → ${delta.nextCount}`)
  else lines.push(`- 合计：${delta.nextCount}（集合数量不变）`)
  if (delta.added.length) lines.push(`- 新增（${delta.added.length}）：${tick(delta.added)}`)
  if (delta.removed.length) lines.push(`- 移除（${delta.removed.length}）：${tick(delta.removed)}`)
  if (delta.updated.length) {
    lines.push(`- 数量变化（${delta.updated.length}）：${delta.updated.map(u => `\`${u.prefix}\` ${u.from ?? '?'} → ${u.to ?? '?'}`).join('、')}`)
  }
  if (delta.meta.length) lines.push(`- 其他元数据更新（${delta.meta.length}）：${tick(delta.meta)}`)
  for (const line of extraLines) lines.push(line)
  return lines.join('\n')
}

/** 插到 Unreleased 节之后，新的日期节靠前。 */
export function insertChangelog(md, entry) {
  const text = String(md ?? '').replace(/\r\n/g, '\n')
  const block = entry.trim()
  const lines = text.split('\n')
  const i = lines.findIndex(l => /^## \[Unreleased\]/.test(l))
  if (i === -1) return `${text.trimEnd()}\n\n${block}\n`
  let j = i + 1
  while (j < lines.length && !/^## /.test(lines[j])) j++
  const before = lines.slice(0, j).join('\n').replace(/\s+$/, '')
  const after = lines.slice(j).join('\n').replace(/^\s+/, '')
  return `${before}\n\n${block}${after ? `\n\n${after}` : '\n'}`
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function catalogOf(file) {
  if (!file || typeof file !== 'object') return {}
  if (file.collections && typeof file.collections === 'object' && !Array.isArray(file.collections)) return file.collections
  return file
}

function resolveIcon(set, name) {
  let ic = set.icons?.[name]
  const alias = set.aliases?.[name]
  if (!ic && alias?.parent) ic = set.icons?.[alias.parent]
  if (!ic?.body) return null
  const w = ic.width || set.width || 16
  const h = ic.height || set.height || 16
  return { b: ic.body, w, h }
}

/** 优先用目录里的 samples（卡片就画这几个），太大的换同套里更小的图标。 */
function pickSamples(set, info) {
  const preferred = Array.isArray(info.samples) ? info.samples : []
  const seen = new Set()
  const out = []
  const consider = [...preferred, ...Object.keys(set.icons || {})]
  for (const name of consider) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    const ic = resolveIcon(set, name)
    if (!ic || ic.b.length > SAMPLE_BODY_MAX) continue
    out.push([name, ic])
    if (out.length >= SAMPLE_CAP) break
  }
  return out
}

function human(n) {
  if (!n) return '0 B'
  const i = Math.min(4, Math.floor(Math.log(n) / Math.log(1024)))
  const v = n / 1024 ** i
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`
}

async function writeAtomic(file, text) {
  const tmp = `${file}.tmp`
  await fsp.writeFile(tmp, text)
  await fsp.rename(tmp, file)
}

/** npm 的 HEAD 不带 content-length，用 Range 的 Content-Range 取压缩包大小。 */
async function registryDist(version) {
  const ac = AbortSignal.timeout(25_000)
  const r = await fetch(`https://registry.npmjs.org/@iconify/json/${version}`, { signal: ac })
  if (!r.ok) return { tarballBytes: 0, unpackedBytes: 0 }
  const j = await r.json()
  const unpackedBytes = Number(j.dist?.unpackedSize || 0) || 0
  const url = j.dist?.tarball
  if (!url) return { tarballBytes: 0, unpackedBytes }
  const h = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: ac, redirect: 'follow' })
  const cr = h.headers.get('content-range') || ''
  const m = cr.match(/\/(\d+)\s*$/)
  try { await h.arrayBuffer() }
  catch { /* 只需要响应头 */ }
  const n = m ? Number(m[1]) : Number(h.headers.get('content-length') || 0)
  return { tarballBytes: Number.isFinite(n) ? n : 0, unpackedBytes }
}

async function main() {
  if (!fs.existsSync(pkgDir)) {
    console.error('找不到 node_modules/@iconify/json。请先 pnpm install。')
    process.exit(1)
  }
  const version = readJson(path.join(pkgDir, 'package.json')).version
  const raw = readJson(path.join(pkgDir, 'collections.json'))
  const jsonDir = path.join(pkgDir, 'json')
  const prefixes = Object.keys(raw).sort()
  const collections = {}
  const samples = {}
  const bytes = {}
  let diskBytes = 0
  let skipped = 0

  for (let i = 0; i < prefixes.length; i++) {
    const prefix = prefixes[i]
    const file = path.join(jsonDir, `${prefix}.json`)
    if (!fs.existsSync(file)) {
      console.warn(`缺少 ${prefix}.json，已跳过`)
      continue
    }
    const size = fs.statSync(file).size
    bytes[prefix] = size
    diskBytes += size
    const set = readJson(file)
    const info = raw[prefix] && typeof raw[prefix] === 'object' ? raw[prefix] : {}
    collections[prefix] = info
    for (const [name, ic] of pickSamples(set, info)) samples[`${prefix}:${name}`] = ic
    const wanted = Array.isArray(info.samples) ? info.samples.length : 0
    const got = Object.keys(samples).filter(k => k.startsWith(`${prefix}:`)).length
    if (wanted && got < Math.min(SAMPLE_CAP, wanted)) skipped += wanted - got
    if ((i + 1) % 40 === 0 || i === prefixes.length - 1) console.log(`已处理 ${i + 1}/${prefixes.length}`)
  }

  const sampleKeys = Object.keys(samples).sort()
  const samplesOut = {}
  let sampleBytes = 0
  for (const k of sampleKeys) {
    samplesOut[k] = samples[k]
    sampleBytes += samples[k].b.length
  }

  let oldCatalog = {}
  let oldMeta = {}
  let oldSamples = ''
  let existed = false
  if (fs.existsSync(catalogPath)) {
    existed = true
    try { oldCatalog = catalogOf(readJson(catalogPath)) }
    catch { oldCatalog = {} }
  }
  if (fs.existsSync(metaPath)) {
    try { oldMeta = readJson(metaPath) }
    catch { oldMeta = {} }
  }
  if (fs.existsSync(samplesPath)) oldSamples = fs.readFileSync(samplesPath, 'utf8')

  let tarball = 0
  let unpacked = 0
  try {
    const dist = await registryDist(version)
    tarball = dist.tarballBytes
    unpacked = dist.unpackedBytes
  }
  catch (e) { console.warn('没有读到 npm 压缩包大小', e instanceof Error ? e.message : e) }
  if (!tarball && oldMeta.tarballBytes) tarball = oldMeta.tarballBytes
  if (!unpacked && oldMeta.unpackedBytes) unpacked = oldMeta.unpackedBytes

  const generated = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const catalogFile = {
    source: '@iconify/json/collections.json',
    version,
    generated,
    note: '由 pnpm sync:iconify 从 @iconify/json 生成。仅含图标集元数据，不含 SVG 正文。',
    collections,
  }
  const metaFile = {
    package: '@iconify/json',
    version,
    generated,
    source: 'node_modules/@iconify/json',
    note: '由 pnpm sync:iconify 生成。完整图标集 JSON 不提交到仓库，运行时再下载到本机。',
    sets: Object.keys(collections).length,
    sampleIcons: sampleKeys.length,
    sampleBytes,
    diskBytes,
    tarballBytes: tarball,
    unpackedBytes: unpacked,
    bytes,
  }
  const samplesText = `${JSON.stringify(samplesOut)}\n`
  const delta = diffCatalog(oldCatalog, collections)
  const catalogDelta = hasCatalogDelta(delta, oldMeta.version, version)
  const samplesChanged = Boolean(oldSamples) && oldSamples !== samplesText
  const bytesChanged = stable(oldMeta.bytes || {}) !== stable(bytes)

  console.log(`图标集 ${metaFile.sets}`)
  console.log(`样例图标 ${sampleKeys.length}（正文约 ${human(sampleBytes)}）${skipped ? `，有 ${skipped} 个官方样例太大已换小图标` : ''}`)
  console.log(`图标 JSON 磁盘 ${human(diskBytes)}`)
  console.log(`npm 压缩包 ${tarball ? human(tarball) : '未知'}，解压后 ${unpacked ? human(unpacked) : '未知'}`)

  const sizeChanged = (oldMeta.tarballBytes || 0) !== tarball || (oldMeta.unpackedBytes || 0) !== unpacked
  if (existed && !catalogDelta && !samplesChanged && !bytesChanged) {
    if (sizeChanged && (tarball || unpacked)) {
      await writeAtomic(metaPath, `${JSON.stringify(metaFile, null, 2)}\n`)
      console.log('目录没有变化，已补上压缩包体积。')
    }
    else console.log('无变化：快照与 CHANGELOG.md 都未改动。')
    return
  }

  await fsp.mkdir(outDir, { recursive: true })
  await writeAtomic(catalogPath, `${JSON.stringify(catalogFile, null, 2)}\n`)
  await writeAtomic(samplesPath, samplesText)
  await writeAtomic(metaPath, `${JSON.stringify(metaFile, null, 2)}\n`)
  console.log(`已写入 ${path.relative(root, catalogPath)}`)
  console.log(`已写入 ${path.relative(root, samplesPath)}`)
  console.log(`已写入 ${path.relative(root, metaPath)}`)

  if (!existed) {
    console.log('这是初始快照，目录差异写在 CHANGELOG 的 Unreleased，不另追加一长串新增前缀。')
    return
  }

  const extras = []
  if (samplesChanged) extras.push(`- 样例图标已更新（${sampleKeys.length} 个）`)
  if (!catalogDelta && !samplesChanged) return
  const date = generated.slice(0, 10)
  const entry = formatEntry(delta, date, oldMeta.version || '', version, extras)
  let md = ''
  try { md = await fsp.readFile(changelogPath, 'utf8') }
  catch {
    md = '# Changelog\n\n## [Unreleased]\n'
  }
  await fsp.writeFile(changelogPath, insertChangelog(md, entry))
  console.log(`已追加 CHANGELOG.md（${date}）`)
  console.log(entry)
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (invoked) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
