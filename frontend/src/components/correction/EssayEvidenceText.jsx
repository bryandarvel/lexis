import {
  resumirEvidencias,
  segmentarTextoComEvidencias,
} from '../../utils/ai-evidence.js'

const estilosMarcacao = [
  'border-amber-300 bg-amber-300/20 decoration-amber-300',
  'border-violet-300 bg-violet-300/20 decoration-violet-300',
  'border-emerald-300 bg-emerald-300/20 decoration-emerald-300',
]

function criarRotuloCriterios(criterios) {
  return criterios
    .map((ordem) => `C${ordem}`)
    .join(', ')
}

export default function EssayEvidenceText({
  texto,
  analise,
}) {
  const criterios =
    analise?.resultadoEstruturado
      ?.analisePorCriterio ?? []
  const segmentos = segmentarTextoComEvidencias(
    texto,
    criterios,
  )
  const resumo = resumirEvidencias(criterios)
  const possuiMarcacoes = resumo.localizadas > 0
  const possuiPendencias =
    resumo.ambiguas + resumo.naoLocalizadas > 0

  return (
    <figure>
      {possuiMarcacoes && (
        <figcaption
          id="legenda-evidencias-ia"
          className="mb-5 rounded-[10px] border border-lexis-300/20 bg-lexis-950/50 p-4 text-sm leading-6 text-lexis-100"
        >
          <strong className="text-white">
            Evidências sugeridas pela IA
          </strong>{' '}
          — {resumo.localizadas}{' '}
          {resumo.localizadas === 1
            ? 'trecho foi localizado'
            : 'trechos foram localizados'}.
          As etiquetas C1, C2 e seguintes indicam o
          critério relacionado; a decisão final é do
          professor.
        </figcaption>
      )}

      <div
        className="font-essay whitespace-pre-wrap text-lexis-50"
        aria-describedby={
          possuiMarcacoes
            ? 'legenda-evidencias-ia'
            : undefined
        }
      >
        {segmentos.length > 0
          ? segmentos.map((segmento) => {
              if (segmento.criterios.length === 0) {
                return segmento.texto
              }

              const rotulo = criarRotuloCriterios(
                segmento.criterios,
              )
              const estilo =
                estilosMarcacao[
                  (segmento.criterios[0] - 1) %
                    estilosMarcacao.length
                ]

              return (
                <span key={`${segmento.inicio}-${segmento.fim}`}>
                  <mark
                    title={`Evidência da IA para ${rotulo}`}
                    className={`border-b-2 text-inherit underline decoration-2 underline-offset-4 ${estilo}`}
                  >
                    {segmento.texto}
                  </mark>
                  <sup
                    className="ml-0.5 rounded bg-lexis-950 px-1 font-sans text-[0.65rem] font-bold text-lexis-100"
                    aria-label={`Evidência dos critérios ${rotulo}`}
                  >
                    {rotulo}
                  </sup>
                </span>
              )
            })
          : 'O texto desta redação não está disponível.'}
      </div>

      {possuiPendencias && (
        <p
          className="mt-5 rounded-[10px] border border-amber-300/25 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100"
          role="status"
        >
          {resumo.ambiguas > 0 && (
            <span className="block">
              {resumo.ambiguas}{' '}
              {resumo.ambiguas === 1
                ? 'evidência contém trecho repetido'
                : 'evidências contêm trechos repetidos'}{' '}
              e não foi marcada automaticamente.
            </span>
          )}
          {resumo.naoLocalizadas > 0 && (
            <span className="block">
              {resumo.naoLocalizadas}{' '}
              {resumo.naoLocalizadas === 1
                ? 'evidência não existe'
                : 'evidências não existem'}{' '}
              literalmente no texto e precisa de revisão.
            </span>
          )}
        </p>
      )}
    </figure>
  )
}
