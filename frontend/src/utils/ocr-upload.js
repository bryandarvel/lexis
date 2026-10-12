import { calcularProgressoUpload } from './essay-editor.js'
import { TIMEOUT_OCR_MS } from './external-request.js'

export function configurarUploadOcr(onProgress) {
  return {
    // O navegador define multipart/form-data e o boundary, sem herdar o JSON da API.
    headers: { 'Content-Type': undefined },
    timeout: TIMEOUT_OCR_MS,
    onUploadProgress(evento) {
      const progresso = calcularProgressoUpload(evento.loaded, evento.total)
      if (progresso !== null && onProgress) onProgress(progresso)
    },
  }
}
