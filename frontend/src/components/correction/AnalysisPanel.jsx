function formatarStatusAnalise(status) {
  const statuses = {
    PENDENTE: 'Pendente',
    PROCESSANDO: 'Processando',
    CONCLUIDA: 'Concluída',
    ERRO: 'Erro',
  }

  return statuses[status] ?? status
}

export default function AnalysisPanel({
  analysis,
  isRequesting,
  notice,
  onRequest,
}) {
  const result =
    analysis?.resultadoEstruturado ?? null

  const analysisInProgress = [
    'PENDENTE',
    'PROCESSANDO',
  ].includes(analysis?.status)

  return (
    <section className="border-t border-lexis-200/10 px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
              Inteligência artificial
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Análise consultiva
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-lexis-200">
              A análise auxilia a avaliação, mas a
              nota e o feedback final continuam sob
              responsabilidade do professor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {analysis && (
              <span className="rounded-full border border-lexis-300/20 bg-lexis-900 px-4 py-2 text-sm font-semibold text-lexis-100">
                {formatarStatusAnalise(
                  analysis.status,
                )}
              </span>
            )}

            <button
              type="button"
              onClick={onRequest}
              disabled={
                isRequesting ||
                analysisInProgress
              }
              className="rounded-xl bg-lexis-400 px-5 py-3 text-sm font-bold text-lexis-950 transition hover:bg-lexis-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRequesting
                ? 'Analisando...'
                : analysis
                  ? 'Solicitar reanálise'
                  : 'Solicitar análise'}
            </button>
          </div>
        </div>

        {!analysis && (
          <div className="mt-8 rounded-2xl border border-dashed border-lexis-200/20 bg-lexis-900/35 p-8 text-lexis-200">
            Nenhuma análise por IA foi solicitada
            para esta redação.
          </div>
        )}

        {analysisInProgress && (
          <div className="mt-8 rounded-2xl border border-lexis-300/20 bg-lexis-900/60 p-6 text-lexis-100">
            A análise está sendo processada. Aguarde
            a conclusão antes de solicitar outra.
          </div>
        )}

        {analysis?.status === 'ERRO' && (
          <div className="mt-8 rounded-2xl border border-red-300/20 bg-red-950/20 p-6">
            <p className="font-bold text-red-100">
              A análise não pôde ser concluída.
            </p>

            <p className="mt-2 text-sm leading-7 text-red-100">
              {analysis.mensagemErro ??
                'Não foi informado um motivo específico.'}
            </p>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className={`mt-8 rounded-xl border px-5 py-4 text-sm font-semibold ${
              notice.type === 'error'
                ? 'border-red-300/20 bg-red-950/20 text-red-100'
                : 'border-emerald-300/20 bg-emerald-950/20 text-emerald-100'
            }`}
          >
            {notice.message}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <article className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
              <h3 className="text-xl font-bold text-white">
                Resumo geral
              </h3>

              <p className="mt-4 whitespace-pre-wrap leading-8 text-lexis-100">
                {result.resumoGeral}
              </p>
            </article>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-emerald-300/15 bg-emerald-950/15 p-6">
                <h3 className="text-xl font-bold text-emerald-100">
                  Pontos fortes
                </h3>

                <ul className="mt-4 space-y-3 text-lexis-100">
                  {result.pontosFortes?.map(
                    (item, index) => (
                      <li
                        key={`${item}-${index}`}
                        className="flex gap-3 leading-7"
                      >
                        <span className="text-emerald-300">
                          •
                        </span>
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </article>

              <article className="rounded-2xl border border-amber-300/15 bg-amber-950/15 p-6">
                <h3 className="text-xl font-bold text-amber-100">
                  Pontos de atenção
                </h3>

                <ul className="mt-4 space-y-3 text-lexis-100">
                  {result.pontosDeAtencao?.map(
                    (item, index) => (
                      <li
                        key={`${item}-${index}`}
                        className="flex gap-3 leading-7"
                      >
                        <span className="text-amber-300">
                          •
                        </span>
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </article>
            </div>

            <div className="grid gap-4">
              {result.analisePorCriterio?.map(
                (criterion) => (
                  <article
                    key={`${criterion.ordem}-${criterion.criterio}`}
                    className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6"
                  >
                    <p className="text-sm font-bold text-lexis-300">
                      Critério {criterion.ordem}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-white">
                      {criterion.criterio}
                    </h3>

                    <p className="mt-4 whitespace-pre-wrap leading-7 text-lexis-100">
                      {criterion.diagnostico}
                    </p>

                    {criterion.evidencias?.length >
                      0 && (
                      <>
                        <p className="mt-5 text-sm font-bold uppercase tracking-[0.15em] text-lexis-300">
                          Evidências no texto
                        </p>

                        <ul className="mt-3 space-y-2 text-sm leading-6 text-lexis-100">
                          {criterion.evidencias.map(
                            (evidence, index) => (
                              <li
                                key={`${evidence}-${index}`}
                                className="rounded-lg bg-lexis-950/50 px-4 py-3"
                              >
                                {evidence}
                              </li>
                            ),
                          )}
                        </ul>
                      </>
                    )}

                    <p className="mt-5 text-sm font-bold uppercase tracking-[0.15em] text-lexis-300">
                      Orientação ao professor
                    </p>

                    <p className="mt-2 whitespace-pre-wrap leading-7 text-lexis-100">
                      {
                        criterion.orientacaoAoProfessor
                      }
                    </p>
                  </article>
                ),
              )}
            </div>

            {result.observacoesFinais && (
              <article className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
                <h3 className="text-xl font-bold text-white">
                  Observações finais
                </h3>

                <p className="mt-4 whitespace-pre-wrap leading-8 text-lexis-100">
                  {result.observacoesFinais}
                </p>
              </article>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
