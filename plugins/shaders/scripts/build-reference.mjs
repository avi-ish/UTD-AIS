#!/usr/bin/env node
// Regenerates the plugin's component reference from an installed `shaders` package.
//
//   node scripts/build-reference.mjs path/to/node_modules/shaders
//
// It reads dist/registry.js as text and parses the JSON array inside it. It never
// imports or executes the package. Outputs:
//   scripts/registry.json                              compact data for check-shaders.mjs
//   skills/shaders/references/components/<Name>.md     one page per component
//   skills/shaders/references/components/INDEX.md      every component, one line each

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRegistrySource, compactRegistry } from './lib/registry.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const pkgDir = process.argv[2]
if (!pkgDir) {
  console.error('usage: node scripts/build-reference.mjs <path to the shaders package>')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
const registry = parseRegistrySource(readFileSync(join(pkgDir, 'dist', 'registry.js'), 'utf8'))

// ---------- compact registry for the validator ----------
const compact = compactRegistry(registry, pkg.version)
writeFileSync(join(here, 'registry.json'), JSON.stringify(compact) + '\n')

// ---------- markdown reference ----------
const outDir = join(root, 'skills', 'shaders', 'references', 'components')
if (existsSync(outDir)) rmSync(outDir, { recursive: true })
mkdirSync(outDir, { recursive: true })

const fmt = v => (v === undefined ? '—' : '`' + JSON.stringify(v).replace(/\|/g, '\\|') + '`')
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ')

function typeLabel(cfg) {
  const ui = cfg.ui
  if (!ui) return 'internal'
  const types = Array.isArray(ui.type) ? ui.type : [ui.type]
  const base = types.filter(t => t !== 'map')
  const names = {
    range: 'number', color: 'color', select: 'enum', position: 'position', origin: 'origin',
    checkbox: 'boolean', 'gradient-stops': 'ColorStop[]', shape: 'shape (JSON string)',
    shape3d: 'shape3d (JSON string)', text: 'string', 'font-family': 'font family',
    'font-weight': 'font weight', layer: 'layer id', 'image-upload': 'image URL',
    'video-upload': 'video URL', list: 'list',
  }
  return base.map(t => names[t] || t).join(', ') || 'number'
}

function rangeLabel(cfg) {
  const ui = cfg.ui || {}
  const parts = []
  if (typeof ui.min === 'number' || typeof ui.max === 'number') {
    parts.push(`${ui.min ?? '…'} – ${ui.max ?? '…'}${ui.step ? ` (step ${ui.step})` : ''}`)
  }
  if (Array.isArray(ui.options)) {
    parts.push(ui.options.map(o => '`' + (o && typeof o === 'object' ? o.value : o) + '`').join(' '))
  }
  return parts.join(' ')
}

function drivable(cfg) {
  const ui = cfg.ui
  if (!ui) return ''
  const types = Array.isArray(ui.type) ? ui.type : [ui.type]
  if (types.includes('map')) return 'map · mouse · auto-animate'
  if (types.includes('position')) return 'mouse-position'
  return ''
}

const byCategory = new Map()
for (const entry of registry) {
  const def = entry.definition || {}
  const requiresChild = !!(entry.requiresChild ?? def.requiresChild)
  const kind = requiresChild
    ? 'Filter: wrap the layers it should affect as children.'
    : def.acceptsOptionalChild
      ? 'Generator that can optionally take a child layer.'
      : 'Generator: draws on its own; place it as a layer.'
  const flags = []
  if (def.usesPointer) flags.push('reacts to the pointer')
  if (def.experimental) flags.push('experimental')
  if (def.capturesDOM) flags.push('captures DOM content')
  if (def.deprecatedNames?.length) flags.push(`formerly ${def.deprecatedNames.join(', ')}`)

  const lines = [
    `# ${entry.name}`,
    '',
    `${entry.description || def.description || ''}`,
    '',
    `- Category: ${entry.category}`,
    `- ${kind}`,
    ...(flags.length ? [`- Notes: ${flags.join('; ')}`] : []),
    '',
    '| Prop | Type | Default | Range / options | Drivers | Description |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const [name, cfg] of Object.entries(def.props || {})) {
    lines.push(`| \`${name}\` | ${typeLabel(cfg)}${cfg.compileTime ? ' (recompiles)' : ''} | ${fmt(cfg.default)} | ${cell(rangeLabel(cfg))} | ${drivable(cfg)} | ${cell(cfg.description)} |`)
  }
  lines.push('', 'Every component also takes the shared layer props (`id`, `blendMode`, `opacity`, `visible`, `maskSource`, `maskType`, `transform`, `renderOrder`, `boundingBox`). See `../layers.md`.', '')
  writeFileSync(join(outDir, `${entry.name}.md`), lines.join('\n'))

  if (!byCategory.has(entry.category)) byCategory.set(entry.category, [])
  byCategory.get(entry.category).push({ name: entry.name, description: entry.description || def.description || '', requiresChild })
}

const index = [
  `# Component index (shaders ${pkg.version})`,
  '',
  `${registry.length} components. **F** marks a filter: it needs child layers to act on. Open \`<Name>.md\` in this folder for props, defaults and ranges.`,
  '',
]
for (const [category, items] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  index.push(`## ${category}`, '')
  for (const it of items.sort((a, b) => a.name.localeCompare(b.name))) {
    index.push(`- **${it.name}**${it.requiresChild ? ' (F)' : ''}: ${it.description}`)
  }
  index.push('')
}
writeFileSync(join(outDir, 'INDEX.md'), index.join('\n'))

console.log(`shaders ${pkg.version}: ${registry.length} components written to ${outDir}`)
