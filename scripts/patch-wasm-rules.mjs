/* scripts/patch-wasm-rules.mjs */

// @cloudflare/vite-plugin emits WASM files and rewrites imports correctly,
// but the generated wrangler.json only declares ESModule rules, so wrangler
// skips .wasm files during deployment. This script adds the missing rule.

import { readFileSync, writeFileSync } from 'node:fs'

const configPath = 'dist/server/wrangler.json'
const config = JSON.parse(readFileSync(configPath, 'utf-8'))

const hasWasmRule = config.rules?.some((r) => r.type === 'CompiledWasm')
if (!hasWasmRule) {
  config.rules = config.rules || []
  config.rules.push({ type: 'CompiledWasm', globs: ['**/*.wasm'] })
  writeFileSync(configPath, JSON.stringify(config))
  console.log('Patched wrangler.json: added CompiledWasm rule')
} else {
  console.log('wrangler.json already has CompiledWasm rule, skipping')
}
