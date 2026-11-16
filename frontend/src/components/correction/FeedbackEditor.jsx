import { useEffect, useRef } from 'react'
import Botao from '../base/Botao.jsx'
import { COMPETENCIAS_ENEM, calcularNotaTotalCompetencias } from '../../constants/competencias-enem.js'
import { montarDadosFeedback } from '../../utils/professor-correction.js'

export default function FeedbackEditor({ action, form, onFieldChange, bloqueado }) {
  const total = calcularNotaTotalCompetencias(montarDadosFeedback(form))
  return (
    <>
      <section className="review-card review-grades" aria-labelledby="review-grades-title">
        <h2 id="review-grades-title" tabIndex={-1}>Notas</h2>
        <p className="review-caption">Avaliação humana · cada competência de 0 a 200.</p>
        <div className="review-scores">
          {COMPETENCIAS_ENEM.map(({ campo, numero, titulo }) => <label key={campo} className={campo === 'competencia2' ? 'is-c2' : ''}>
            <span>Competência {numero}</span>
            <input type="number" min="0" max="200" step="1" inputMode="numeric" aria-label={`Nota da Competência ${numero}`} title={titulo}
              value={form[campo] ?? ''} placeholder="—" disabled={Boolean(action) || bloqueado} onChange={(event) => onFieldChange(campo, event.target.value)} />
          </label>)}
          <div className="review-total"><span>Total</span><output aria-label="Nota total">{total ?? '—'}</output></div>
        </div>
        {form.legacyScore && <p className="review-caption">Nota total da versão anterior: {form.legacyScore}. Preencha C1–C5 para publicar uma nova versão.</p>}
      </section>
      <section className="review-card review-general" aria-labelledby="review-general-title">
        <h2 id="review-general-title"><label htmlFor="review-general-comment">Comentário geral</label></h2>
        <textarea id="review-general-comment" rows={3} maxLength={10000} value={form.generalComment} disabled={Boolean(action) || bloqueado}
          onChange={(event) => onFieldChange('generalComment', event.target.value)} placeholder="Escreva um comentário geral sobre a redação..." />
        <span className="review-counter">{form.generalComment.length}/10000</span>
      </section>
    </>
  )
}

export function FeedbackActions({ action, currentFeedback, notice, onSave, onPublish, publicada, publicacaoIdentica, recarregarObrigatorio, onReload }) {
  const noticeRef = useRef(null)
  useEffect(() => {
    if (notice?.type === 'error') noticeRef.current?.focus()
  }, [notice])
  return <section className="review-actions" aria-label="Salvar e publicar">
    <p className="review-caption">{currentFeedback ? `Versão ${currentFeedback.numero} · ${currentFeedback.status === 'PUBLICADA' ? 'Publicada' : 'Rascunho'}. ` : ''}Salvar não publica para o aluno.</p>
    {publicacaoIdentica && !recarregarObrigatorio && <p className="review-caption">Sem alterações em relação à versão publicada.</p>}
    {notice && <p ref={noticeRef} tabIndex={-1} role={notice.type === 'error' ? 'alert' : 'status'} className={`review-notice ${notice.type}`}>{notice.message}</p>}
    <div className="review-mark-actions">
      {recarregarObrigatorio ? <Botao onClick={onReload}>Recarregar a página</Botao> : <>
        <Botao variante="secundario" disabled={Boolean(action)} onClick={onSave}>{action === 'saving' ? 'Salvando…' : 'Salvar'}</Botao>
        <Botao disabled={Boolean(action) || publicacaoIdentica} onClick={onPublish}>{action === 'publishing' ? 'Publicando…' : publicada ? 'Publicar nova versão' : 'Publicar correção'}</Botao>
      </>}
    </div>
  </section>
}
