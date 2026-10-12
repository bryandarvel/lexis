import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import { configurarUploadOcr } from '../src/utils/ocr-upload.js'

test('upload preserva o arquivo FormData mesmo quando a API usa JSON por padrão', async () => {
  let recebido
  const api = axios.create({
    headers: { 'Content-Type': 'application/json' },
    adapter: async config => {
      recebido = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  const formulario = new FormData()
  formulario.append('imagem', new Blob(['imagem ficticia'], { type: 'image/png' }), 'ficticia.png')
  await api.post('/ocr', formulario, configurarUploadOcr())
  assert.ok(recebido.data instanceof FormData)
  assert.equal(recebido.data.get('imagem').name, 'ficticia.png')
  assert.equal(recebido.data.get('imagem').size, 15)
  assert.notEqual(recebido.headers.get('Content-Type'), 'application/json')
})

test('progresso de upload ignora tamanho desconhecido e respeita o limite', () => {
  const valores = []
  const config = configurarUploadOcr(valor => valores.push(valor))
  config.onUploadProgress({ loaded: 50 })
  config.onUploadProgress({ loaded: 50, total: 100 })
  config.onUploadProgress({ loaded: 200, total: 100 })
  assert.deepEqual(valores, [50, 100])
})
