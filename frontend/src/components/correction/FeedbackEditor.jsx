import { useEffect, useRef } from 'react'
import { COMPETENCIAS_ENEM, calcularNotaTotalCompetencias } from '../../constants/competencias-enem.js'
import { montarDadosFeedback } from '../../utils/professor-correction.js'

export default function FeedbackEditor({ action, currentFeedback, form, notice, onFieldChange, onPublish }) {
  const total = calcularNotaTotalCompetencias(montarDadosFeedback(form))
  const noticeRef = useRef(null)
  useEffect(() => {
    if (notice?.type === 'error') { noticeRef.current?.scrollIntoView({ block: 'nearest' }); noticeRef.current?.focus() }
  }, [notice])
  return (
    <>
      <section className="review-card review-grades" aria-labelledby="review-grades-title">
        <h2 id="review-grades-title">Notas</h2>
        <p className="review-caption">Avaliação humana · cada competência de 0 a 200.</p>
        <div className="review-scores">
          {COMPETENCIAS_ENEM.map(({ campo, numero, titulo }) => <label key={campo} className={campo === 'competencia2' ? 'is-c2' : ''}>
            <span>Competência {numero}</span>
            <input type="number" min="0" max="200" step="1" inputMode="numeric" aria-label={`Nota da Competência ${numero}`} title={titulo}
              value={form[campo] ?? ''} placeholder="—" disabled={Boolean(action)} onChange={(event) => onFieldChange(campo, event.target.value)} />
          </label>)}
          <div className="review-total"><span>Total</span><output aria-label="Nota total">{total ?? '—'}</output></div>
        </div>
        {form.legacyScore && <p className="review-caption">Nota total da versão anterior: {form.legacyScore}. Preencha C1–C5 para publicar uma nova versão.</p>}
      </section>
      <section className="review-card review-general" aria-labelledby="review-general-title">
        <h2 id="review-general-title"><label htmlFor="review-general-comment">Comentário geral</label></h2>
        <textarea id="review-general-comment" rows={3} maxLength={10000} value={form.generalComment} disabled={Boolean(action)}
          onChange={(event) => onFieldChange('generalComment', event.target.value)} placeholder="Escreva um comentário geral sobre a redação..." />
        <span className="review-counter">{form.generalComment.length}/10000</span>
        <div className="review-publish-row"><p className="review-caption">{currentFeedback ? `Versão ${currentFeedback.numero} · ${currentFeedback.status === 'PUBLICADA' ? 'Publicada' : 'Rascunho'}. ` : ''}Salvar não publica para o aluno.</p>
          <button type="button" className="panel-primary-button" disabled={Boolean(action)} onClick={onPublish}>{action === 'publishing' ? 'Publicando…' : 'Publicar correção'}</button>
        </div>
        {notice && <p ref={noticeRef} tabIndex={-1} role={notice.type === 'error' ? 'alert' : 'status'} className={`review-notice ${notice.type}`}>{notice.message}</p>}
      </section>
    </>
  )
}
