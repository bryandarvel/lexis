import { comentarioEditavel, tomCriterio } from '../../utils/professor-correction.js'

export default function CriterionComments({ criterios, analise, form, disabled, onChange }) {
  function focarComentario(id) {
    requestAnimationFrame(() => document.getElementById(`review-comment-${id}`)?.focus())
  }
  return <section aria-labelledby="review-comments-title">
    <h2 id="review-comments-title" className="review-section-title" tabIndex={-1}>Comentários por critério</h2>
    <div className="review-comment-list">{criterios.map((c, indice) => {
      const { texto, sugerido } = comentarioEditavel(form, analise, c)
      return <article key={c.id} id={`review-criterion-${c.ordem}`} tabIndex={-1} className={`review-card review-comment review-tone-${tomCriterio(c, indice)}`}>
        <div className="review-comment-heading"><h3>{c.nome}</h3>
          <span className={`review-badge ${!sugerido && texto ? 'human' : ''}`}>{sugerido ? 'Sugestão da IA' : texto ? 'Texto do professor' : 'Sem comentário'}</span>
        </div>
        <textarea id={`review-comment-${c.id}`} aria-label={`Comentário: ${c.nome}`} aria-describedby={`review-comment-hint-${c.id}`} rows={5} maxLength={5000} value={texto} disabled={disabled}
          className={sugerido ? 'review-suggestion' : undefined}
          onChange={(event) => onChange(c.id, event.target.value)} placeholder="Escreva seu comentário sobre este critério…" />
        {sugerido && <>
          <div className="review-suggestion-actions">
            <button type="button" disabled={disabled} onClick={() => { onChange(c.id, texto); focarComentario(c.id) }}>Usar sugestão</button>
            <button type="button" disabled={disabled} onClick={() => { onChange(c.id, ''); focarComentario(c.id) }}>Descartar</button>
          </div>
        </>}
        <p id={`review-comment-hint-${c.id}`} className="review-caption">{sugerido ? 'Edite ou apague livremente. Para manter o texto sem alterações, clique em Usar sugestão.' : 'Comentário opcional. Revise antes de publicar; a nota é definida por você.'}</p>
        <span className="review-counter">{texto.length}/5000</span>
      </article>
    })}</div>
  </section>
}
