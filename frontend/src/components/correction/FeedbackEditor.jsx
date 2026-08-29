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
          <div className={embedded ? 'grid gap-4' : 'grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]'}>
            <label className="block rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
              <span className="text-sm font-bold text-white">
                Nota total
              </span>

              <input
                type="number"
                min="0"
                max="1000"
                step="1"
                value={form.score}
                onChange={(event) =>
                  onFieldChange(
                    'score',
                    event.target.value,
                  )
                }
                placeholder="0 a 1000"
                className="mt-4 w-full rounded-xl border border-lexis-200/15 bg-lexis-950 px-4 py-3 text-2xl font-bold text-white outline-none transition focus:border-lexis-300"
              />

              <span className="mt-3 block text-xs leading-5 text-lexis-300">
                Utilize a escala convencional do
                ENEM, entre 0 e 1000.
              </span>
            </label>

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
              alteram diretamente a nota total.
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
