import { evidenciasVerificadas, tomCriterio } from '../../utils/professor-correction.js'
import { resumirEvidencias } from '../../utils/ai-evidence.js'

export default function EssayEvidenceText({ texto, analise, criterios = [], onEvidence }) {
  const { segmentos, trechos } = evidenciasVerificadas(texto ?? '', analise)
  const resumo = resumirEvidencias(analise?.resultadoEstruturado?.analisePorCriterio)
  return <figure>
    <figcaption className="review-caption" id="review-evidence-description">Marcações consultivas da IA. Toque ou pressione Enter em um trecho para abrir os comentários relacionados.</figcaption>
    {analise?.status === 'CONCLUIDA' && <>
      <ul className="review-evidence-legend" aria-label="Trechos marcados por critério">{criterios.map((c) => {
        const quantidade = trechos.filter((t) => t.ordens.includes(c.ordem)).length
        return <li key={c.id ?? c.ordem} className={`review-tone-${tomCriterio(c)}`}>
          <span className="review-color" aria-hidden="true" /><span>{c.nome}: {quantidade} {quantidade === 1 ? 'trecho marcado' : 'trechos marcados'}</span>
        </li>
      })}</ul>
      <p className="review-caption">Os números identificam trechos, não critérios. Um mesmo trecho pode apoiar vários critérios; ausência de marcação não significa que o critério deixou de ser analisado.</p>
    </>}
    <div className="review-essay-text" aria-describedby="review-evidence-description">
      {segmentos.length ? segmentos.map((segmento) => {
        if (!segmento.criterios.length) return segmento.texto
        const relacionados = criterios.filter((c) => segmento.criterios.includes(c.ordem))
        const tom = tomCriterio(relacionados[0] ?? {})
        const tons = [...new Set(relacionados.map((c) => tomCriterio(c)))]
        const compartilhado = tons.length > 1 ? {
          borderBottomColor: 'transparent',
          backgroundImage: tons.map((t) => `linear-gradient(var(--review-color-${t}), var(--review-color-${t}))`).join(', '),
          backgroundSize: '100% 2px',
          backgroundPosition: tons.map((_, i) => `left bottom ${i * 2}px`).join(', '),
          backgroundRepeat: 'no-repeat',
          paddingBottom: `${tons.length * 2 - 1}px`,
        } : undefined
        const rotulo = relacionados.map((c) => c.nome).join(', ') || `critérios ${segmento.criterios.join(', ')}`
        const numero = trechos.findIndex((e) => e.inicio <= segmento.inicio && e.fim >= segmento.fim) + 1
        return <button key={`${segmento.inicio}-${segmento.fim}`} type="button" className={`review-mark review-tone-${tom}`}
          style={compartilhado}
          onClick={() => onEvidence?.(segmento.criterios)} aria-label={`Trecho ${numero}: ${segmento.texto}. Comentários: ${rotulo}`}>
          <mark>{segmento.texto}</mark><sup aria-hidden="true">{String(numero).padStart(2, '0')}</sup>
        </button>
      }) : 'O texto desta redação não está disponível.'}
    </div>
    {segmentos.some((s) => s.criterios.length > 1) && <p className="review-caption">Um mesmo trecho pode apoiar mais de um critério. Os sublinhados coloridos indicam os critérios relacionados.</p>}
    {(resumo.ambiguas + resumo.naoLocalizadas + resumo.legadas > 0 || (resumo.localizadas > 0 && !trechos.length)) &&
      <p className="review-notice" role="status">Há evidências sem localização confirmada. Elas não foram marcadas automaticamente; consulte os detalhes da análise.</p>}
  </figure>
}
