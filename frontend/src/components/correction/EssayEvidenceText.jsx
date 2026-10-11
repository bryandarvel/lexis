import { evidenciasVerificadas, tomCriterio } from '../../utils/professor-correction.js'
import { resumirEvidencias } from '../../utils/ai-evidence.js'

export default function EssayEvidenceText({ texto, analise, criterios = [], onEvidence }) {
  const { segmentos, trechos } = evidenciasVerificadas(texto ?? '', analise)
  const resumo = resumirEvidencias(analise?.resultadoEstruturado?.analisePorCriterio)
  return <figure>
    <figcaption className="review-caption" id="review-evidence-description">Marcações consultivas da IA. Toque ou pressione Enter em um trecho para abrir os comentários relacionados.</figcaption>
    <div className="review-essay-text" aria-describedby="review-evidence-description">
      {segmentos.length ? segmentos.map((segmento) => {
        if (!segmento.criterios.length) return segmento.texto
        const relacionados = criterios.filter((c) => segmento.criterios.includes(c.ordem))
        const tom = tomCriterio(relacionados[0] ?? {}, Math.max(0, criterios.indexOf(relacionados[0])))
        const rotulo = relacionados.map((c) => c.nome).join(', ') || `critérios ${segmento.criterios.join(', ')}`
        const numero = trechos.findIndex((e) => e.inicio <= segmento.inicio && e.fim >= segmento.fim) + 1
        return <button key={`${segmento.inicio}-${segmento.fim}`} type="button" className={`review-mark review-tone-${tom}`}
          onClick={() => onEvidence?.(segmento.criterios)} aria-label={`Trecho ${numero}: ${segmento.texto}. Comentários: ${rotulo}`}>
          <mark>{segmento.texto}</mark><sup aria-hidden="true">{String(numero).padStart(2, '0')}</sup>
        </button>
      }) : 'O texto desta redação não está disponível.'}
    </div>
    {(resumo.ambiguas + resumo.naoLocalizadas + resumo.legadas > 0 || (resumo.localizadas > 0 && !trechos.length)) &&
      <p className="review-notice" role="status">Há evidências sem localização confirmada. Elas não foram marcadas automaticamente; consulte os detalhes da análise.</p>}
  </figure>
}
