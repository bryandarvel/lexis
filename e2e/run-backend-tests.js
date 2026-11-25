import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { configurarAmbiente } from './runtime.js'

configurarAmbiente()
// A suíte existente verifica a URL padrão do cliente com fetch simulado.
process.env.OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image'
const resultado = spawnSync(process.execPath, [
  '--import', new URL('./block-external-fetch.js', import.meta.url).href,
  '--test', '--test-reporter=spec', '--test-concurrency=1',
], {
  cwd: fileURLToPath(new URL('../backend/', import.meta.url)),
  env: process.env, stdio: 'inherit',
})
if (resultado.error) console.error('Não foi possível iniciar a suíte backend isolada.')
process.exitCode = resultado.status ?? 1
