import {
  calcularNotaTotalCompetencias,
  COMPETENCIAS_ENEM,
} from '../../constants/competencias-enem.js'

function formatarStatusFeedback(status) {
  const statuses = {
    RASCUNHO: 'Rascunho',
    PUBLICADA: 'Publicada',
    SUBSTITUIDA: 'Substituída',
  }

  return statuses[status] ?? status
}

export default function FeedbackEditor({
  action,
  criteria,
  currentFeedback,
  embedded = false,
  form,
  notice,
  onCriterionChange,
  onFieldChange,
  onPublish,
  onSave,
}) {
  const isBusy = Boolean(action)
  const dadosNumericos = Object.fromEntries(
    COMPETENCIAS_ENEM.map(({ campo }) => {
      const texto = String(form[campo] ?? '').trim()

      return [
        campo,
        texto === '' ? null : Number(texto),
      ]
    }),
  )
  const notaTotal =
    calcularNotaTotalCompetencias(dadosNumericos)

  const noticeClasses =
    notice?.type === 'error'
      ? 'border-red-300/20 bg-red-950/20 text-red-100'
      : 'border-emerald-300/20 bg-emerald-950/20 text-emerald-100'

  return (
    <section
      className={
        embedded
          ? 'correction-tool-section'
          : 'border-t border-lexis-200/10 px-6 py-12 sm:px-10 lg:px-16'
      }
    >
      <div className={embedded ? '' : 'mx-auto max-w-7xl'}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
              Avaliação humana
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Feedback do professor
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-lexis-200">
              Salve quantas vezes precisar. O aluno
              só verá a correção depois da publicação.
            </p>
          </div>

          {currentFeedback && (
            <span className="rounded-full border border-lexis-300/20 bg-lexis-900 px-4 py-2 text-sm font-semibold text-lexis-100">
              {formatarStatusFeedback(
                currentFeedback.status,
              )}
            </span>
          )}
        </div>

        <form
          onSubmit={onSave}
          className="mt-8 space-y-6"
        >
          <div className={embedded ? 'grid gap-4' : 'grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'}>
            <fieldset className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
              <legend className="px-2 text-sm font-bold text-white">
                Pontuação por competência
              </legend>

              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                {COMPETENCIAS_ENEM.map(
                  ({ campo, numero, titulo }) => (
                    <label
                      key={campo}
                      className="block"
                    >
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-lexis-300">
                        Competência {numero}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-lexis-200">
                        {titulo}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        step="1"
                        inputMode="numeric"
                        value={form[campo] ?? ''}
                        onChange={(event) =>
                          onFieldChange(
                            campo,
                            event.target.value,
                          )
                        }
                        placeholder="0 a 200"
                        className="mt-2 w-full rounded-xl border border-lexis-200/15 bg-lexis-950 px-4 py-3 text-xl font-bold text-white outline-none transition focus:border-lexis-300"
                      />
                    </label>
                  ),
                )}
              </div>

              <output className="mt-5 block rounded-xl border border-lexis-200/10 bg-lexis-950/60 px-4 py-3 text-sm font-semibold text-lexis-100">
                Nota total:{' '}
                <strong className="text-lg text-white">
                  {notaTotal ?? '—'}
                </strong>{' '}
                / 1000
              </output>

              {form.legacyScore && (
                <p className="mt-3 text-xs leading-5 text-amber-200">
                  Nota total da versão anterior: {form.legacyScore}.
                  Preencha C1–C5 para publicar uma nova versão.
                </p>
              )}
            </fieldset>

            <label className="block rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
              <span className="text-sm font-bold text-white">
                Comentário geral
              </span>

              <textarea
                rows="7"
                maxLength="10000"
                value={form.generalComment}
                onChange={(event) =>
                  onFieldChange(
                    'generalComment',
                    event.target.value,
                  )
                }
                placeholder="Escreva a avaliação geral da redação..."
                className="mt-4 w-full resize-y rounded-xl border border-lexis-200/15 bg-lexis-950 px-4 py-3 leading-7 text-white outline-none transition placeholder:text-lexis-400 focus:border-lexis-300"
              />

              <span className="mt-2 block text-right text-xs text-lexis-300">
                {form.generalComment.length}/10000
              </span>
            </label>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              Comentários por critério
            </h3>

            <p className="mt-2 text-sm leading-6 text-lexis-200">
              Estes comentários são opcionais e não
              alteram diretamente as notas das competências.
            </p>

            <div className={embedded ? 'mt-5 grid gap-4' : 'mt-5 grid gap-4 lg:grid-cols-2'}>
              {criteria.map((criterion) => (
                <label
                  key={criterion.id}
                  className="block rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-lexis-300">
                    Critério {criterion.ordem}
                  </span>

                  <span className="mt-2 block text-lg font-bold text-white">
                    {criterion.nome}
                  </span>

                  <textarea
                    rows="5"
                    maxLength="5000"
                    value={
                      form.criterionComments[
                        criterion.id
                      ] ?? ''
                    }
                    onChange={(event) =>
                      onCriterionChange(
                        criterion.id,
                        event.target.value,
                      )
                    }
                    placeholder="Comentário específico deste critério..."
                    className="mt-4 w-full resize-y rounded-xl border border-lexis-200/15 bg-lexis-950 px-4 py-3 leading-7 text-white outline-none transition placeholder:text-lexis-400 focus:border-lexis-300"
                  />
                </label>
              ))}
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className={`rounded-xl border px-5 py-4 text-sm font-semibold ${noticeClasses}`}
            >
              {notice.message}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-xl border border-lexis-300/25 bg-lexis-900 px-5 py-3 text-sm font-bold text-lexis-100 transition hover:border-lexis-300/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'saving'
                ? 'Salvando...'
                : 'Salvar rascunho'}
            </button>

            <button
              type="button"
              onClick={onPublish}
              disabled={isBusy}
              className="rounded-xl bg-lexis-400 px-5 py-3 text-sm font-bold text-lexis-950 transition hover:bg-lexis-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'publishing'
                ? 'Publicando...'
                : 'Salvar e publicar'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
