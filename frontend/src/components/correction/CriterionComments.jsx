import { useState } from 'react'
import { sugestaoDoCriterio, tomCriterio } from '../../utils/professor-correction.js'

export default function CriterionComments({ criterios, analise, form, disabled, onChange }) {
  const [descartadas, setDescartadas] = useState({})
  const [usadas, setUsadas] = useState({})
  function focarComentario(id) {
    requestAnimationFrame(() => document.getElementById(`review-comment-${id}`)?.focus())
  }
  return <section aria-labelledby="review-comments-title">
    <h2 id="review-comments-title" className="review-section-title" tabIndex={-1}>Comentários por critério</h2>
    <div className="review-comment-list">{criterios.map((c, indice) => {
      const sugestao = sugestaoDoCriterio(analise, c)
      const chave = `${analise?.id}:${c.id}`
      const comentario = form.criterionComments[c.id] ?? ''
      const mostrarSugestao = sugestao && !comentario && !descartadas[chave]
      return <article key={c.id} id={`review-criterion-${c.ordem}`} tabIndex={-1} className={`review-card review-comment review-tone-${tomCriterio(c, indice)}`}>
        <div className="review-comment-heading"><h3>{c.nome}</h3>
          <span className={`review-badge ${comentario ? 'human' : ''}`}>{comentario ? 'Texto do professor' : mostrarSugestao ? 'Sugestão da IA' : 'Sem comentário'}</span>
        </div>
        {mostrarSugestao ? <>
          <p className="review-suggestion">{sugestao.diagnostico}</p>
          <div className="review-suggestion-actions">
            <button type="button" disabled={disabled} onClick={() => { onChange(c.id, sugestao.diagnostico); setUsadas((atual) => ({ ...atual, [chave]: true })); focarComentario(c.id) }}>Usar sugestão</button>
            <button type="button" disabled={disabled} onClick={() => { setDescartadas((atual) => ({ ...atual, [chave]: true })); focarComentario(c.id) }}>Descartar</button>
          </div>
          <span className="review-caption">Revise o texto após incorporá-lo.</span>
        </> : <>
          <textarea id={`review-comment-${c.id}`} aria-label={`Comentário: ${c.nome}`} rows={5} maxLength={5000} value={comentario} disabled={disabled}
            onChange={(event) => onChange(c.id, event.target.value)} placeholder="Escreva seu comentário sobre este critério…" />
          <p className="review-caption">{usadas[chave] ? 'Sugestão incorporada · revise antes de publicar.' : 'Comentário opcional. A nota é definida por você.'}</p>
        </>}
        <span className="review-counter">{mostrarSugestao ? sugestao.diagnostico.length : comentario.length}/5000</span>
      </article>
    })}</div>
  </section>
}
