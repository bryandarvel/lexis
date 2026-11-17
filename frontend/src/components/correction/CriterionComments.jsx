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
      const { texto, sugestao } = comentarioEditavel(form, analise, c)
      return <article key={c.id} id={`review-criterion-${c.ordem}`} tabIndex={-1} className={`review-card review-comment review-tone-${tomCriterio(c, indice)}`}>
        <div className="review-comment-heading"><h3>{c.nome}</h3>
          <Etiqueta tom={texto ? 'sucesso' : 'acao'}>{texto ? 'Texto do professor' : 'Sem comentário'}</Etiqueta>
        </div>
        {sugestao && <div className="review-suggestion">
          <p><strong>Sugestão da IA, não publicada</strong></p>
          <p>{sugestao}</p>
          <div className="review-suggestion-actions">
            <button type="button" disabled={disabled} onClick={() => { onChange(c.id, sugestao); focarComentario(c.id) }}>Usar como ponto de partida</button>
            <button type="button" disabled={disabled} onClick={() => { onChange(c.id, ''); focarComentario(c.id) }}>Dispensar</button>
          </div>
        </div>}
        <textarea id={`review-comment-${c.id}`} aria-label={`Comentário: ${c.nome}`} rows={5} maxLength={5000} value={texto} disabled={disabled}
          onChange={(event) => onChange(c.id, event.target.value)} placeholder="Escreva seu comentário sobre este critério…" />
        <span className="review-counter">{texto.length}/5000</span>
        <SelecaoTrechos texto={textoRedacao} criterio={c} {...marcacoes[c.id]} numeros={numeros} salvando={disabled}
          onAlterar={(trechos) => onTrechos(c.id, trechos)} onDescartar={onDescartar} onVerNoTexto={onVerNoTexto} />
      </article>
    })}</div>
  </section>
}
