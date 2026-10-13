import { descreverSugestao } from '../../utils/essay-editor.js'

const CORES_PONTO = {
  erro: 'bg-[var(--aluno-erro)]',
  atencao: 'bg-[var(--aluno-atencao)]',
}

function BotaoRevisar({
  children,
  desabilitado,
  onRevisar,
}) {
  return (
    <button
      type="button"
      onClick={onRevisar}
      disabled={desabilitado}
      className="mt-4 h-10 rounded-lg border border-[var(--aluno-borda-campo)] px-4 text-[13px] font-semibold leading-[18px] text-lexis-100 transition-colors hover:bg-[var(--aluno-neutro-fundo)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      {children}
    </button>
  )
}

function ItemSugestao({
  sugestao,
  desabilitado,
  onAplicar,
}) {
  const descricao = descreverSugestao(sugestao)
  const [principal, ...alternativas] =
    sugestao.substituicoes ?? []

  return (
    <li
      title={sugestao.mensagem}
      className="flex items-center gap-2.5 rounded-lg bg-[var(--aluno-neutro-fundo)] py-[5px] pl-3 pr-2"
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${CORES_PONTO[descricao.tom]}`}
      />

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm leading-[22px] text-lexis-100">
          {descricao.texto}
        </p>
        <p className="text-xs font-medium leading-[17px] text-lexis-200">
          {descricao.categoria}
        </p>
        {sugestao.mensagem &&
          sugestao.mensagem !== descricao.texto && (
            <p className="sr-only">
              {sugestao.mensagem}
            </p>
          )}

        {alternativas.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium leading-[17px] text-[var(--aluno-acao-suave-texto)]">
              Outras opções
            </summary>
            <div className="mt-1.5 flex flex-wrap gap-1.5 pb-1">
              {alternativas.map((substituicao) => (
                <button
                  key={substituicao}
                  type="button"
                  disabled={desabilitado}
                  onClick={() =>
                    onAplicar(sugestao, substituicao)
                  }
                  className="min-h-8 rounded-md border border-[var(--aluno-borda-campo)] px-2.5 text-xs font-semibold text-lexis-100 disabled:opacity-55"
                >
                  Aplicar “{substituicao}”
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {principal && (
        <button
          type="button"
          disabled={desabilitado}
          onClick={() => onAplicar(sugestao, principal)}
          className="h-8 shrink-0 self-start rounded-md px-2.5 text-xs font-semibold text-[var(--aluno-acao-suave-texto)] transition-colors hover:bg-[var(--aluno-acao-suave)] disabled:opacity-55"
        >
          Aplicar
          <span className="sr-only">
            {' '}“{principal}” no lugar de “{sugestao.trecho}”
          </span>
        </button>
      )}
    </li>
  )
}

export default function RevisaoLinguisticaCard({
  estado,
  desabilitado,
  onRevisar,
  onAplicar,
}) {
  const carregando = estado.status === 'carregando'
  const concluida = estado.status === 'pronto'
  const falhou =
    estado.status === 'erro' ||
    estado.status === 'indisponivel'

  return (
    <section
      aria-labelledby="titulo-revisao-linguistica"
      aria-busy={carregando}
      className="aluno-elevacao-1 min-h-[232px] rounded-xl border border-[var(--surface-border)] bg-lexis-900 px-5 pb-4 pt-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="titulo-revisao-linguistica"
          className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50"
        >
          Revisão linguística
        </h2>
        <span className="inline-flex h-6 w-[84px] shrink-0 items-center justify-center rounded-full bg-[var(--aluno-trilho)] text-xs font-medium leading-[17px] text-lexis-200">
          opcional
        </span>
      </div>
      <p className="mt-0.5 text-xs font-medium leading-[17px] text-lexis-200">
        Sugestões do LanguageTool. Você decide se aplica.
      </p>

      {estado.status === 'inicial' && (
        <>
          <p className="mt-4 text-xs leading-[17px] text-lexis-200">
            Ao revisar, o texto atual é enviado ao serviço LanguageTool configurado. As sugestões nunca bloqueiam o salvamento nem o envio.
          </p>
          <BotaoRevisar
            desabilitado={desabilitado}
            onRevisar={onRevisar}
          >
            Revisar texto
          </BotaoRevisar>
        </>
      )}

      {carregando && (
        <p
          role="status"
          className="mt-4 animate-pulse text-sm leading-[22px] text-lexis-100"
        >
          Consultando o LanguageTool...
        </p>
      )}

      {falhou && (
        <>
          <p
            role={
              estado.status === 'erro'
                ? 'alert'
                : 'status'
            }
            className="mt-4 text-sm leading-[22px] text-lexis-100"
          >
            {estado.mensagem}
          </p>
          <BotaoRevisar
            desabilitado={desabilitado}
            onRevisar={onRevisar}
          >
            Tentar novamente
          </BotaoRevisar>
        </>
      )}

      {concluida && estado.sugestoes.length === 0 && (
        <>
          <p
            role="status"
            className="mt-4 text-sm leading-[22px] text-lexis-100"
          >
            {estado.mensagem}
          </p>
          <BotaoRevisar
            desabilitado={desabilitado}
            onRevisar={onRevisar}
          >
            Revisar novamente
          </BotaoRevisar>
        </>
      )}

      {concluida && estado.sugestoes.length > 0 && (
        <>
          <p
            role="status"
            className="sr-only"
          >
            {estado.mensagem}
          </p>
          <ul className="mt-[15px] space-y-1.5">
            {estado.sugestoes.map((sugestao) => (
              <ItemSugestao
                key={sugestao.id}
                sugestao={sugestao}
                desabilitado={desabilitado}
                onAplicar={onAplicar}
              />
            ))}
          </ul>
          <BotaoRevisar
            desabilitado={desabilitado}
            onRevisar={onRevisar}
          >
            Revisar novamente
          </BotaoRevisar>
        </>
      )}
    </section>
  )
}
