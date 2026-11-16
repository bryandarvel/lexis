import Etiqueta from '../base/Etiqueta.jsx'
import { comentarioEditavel, tomCriterio } from '../../utils/professor-correction.js'
import SelecaoTrechos from './SelecaoTrechos.jsx'

export default function CriterionComments({ criterios, analise, form, disabled, onChange, textoRedacao, marcacoes, numeros, onTrechos, onDescartar, onVerNoTexto }) {
  function focarComentario(id) {
    requestAnimationFrame(() => document.getElementById(`review-comment-${id}`)?.focus())
  }
  return <section aria-labelledby="review-comments-title">
    <h2 id="review-comments-title" className="review-section-title" tabIndex={-1}>Comentários por critério</h2>
    <div className="review-comment-list">{criterios.map((c, indice) => {
      const { texto, sugerido } = comentarioEditavel(form, analise, c)
      return <article key={c.id} id={`review-criterion-${c.ordem}`} tabIndex={-1} className={`review-card review-comment review-tone-${tomCriterio(c, indice)}`}>
        <div className="review-comment-heading"><h3>{c.nome}</h3>
          <Etiqueta tom={!sugerido && texto ? 'sucesso' : 'acao'}>{sugerido ? 'Sugestão da IA' : texto ? 'Texto do professor' : 'Sem comentário'}</Etiqueta>
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
        <p id={`review-comment-hint-${c.id}`} className="review-caption">{sugerido ? 'Edite ou apague livremente. Para manter o texto sem alterações, clique em Usar sugestão.' : 'Comente se houver trechos marcados neste critério.'}</p>
        <span className="review-counter">{texto.length}/5000</span>
        <SelecaoTrechos texto={textoRedacao} criterio={c} {...marcacoes[c.id]} numeros={numeros} salvando={disabled}
          onAlterar={(trechos) => onTrechos(c.id, trechos)} onDescartar={onDescartar} onVerNoTexto={onVerNoTexto} />
      </article>
    })}</div>
  </section>
}
