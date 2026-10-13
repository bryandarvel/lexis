import { useId } from 'react'

function formatarTamanho(bytes) {
  if (!Number.isFinite(bytes)) {
    return ''
  }

  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} KB`
}

function IconeFoto() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8 text-[var(--aluno-acao-suave-texto)]"
    >
      <path d="M4 7h3l2-3h6l2 3h3v12H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function ProgressoOcr({ progresso }) {
  const processando = progresso >= 100

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6"
    >
      {processando ? (
        <>
          <p className="text-sm font-medium leading-[22px] text-lexis-100">
            Transcrevendo a imagem. Isso pode levar alguns segundos.
          </p>
          <div
            role="progressbar"
            aria-label="Transcrição da imagem em andamento"
            aria-valuetext="Em andamento"
            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--aluno-trilho)]"
          >
            <div className="h-full w-full animate-pulse rounded-full bg-[var(--color-brand-accent)]" />
          </div>
        </>
      ) : (
        <>
          <p className="flex justify-between gap-3 text-sm font-medium leading-[22px] text-lexis-100">
            <span>Enviando a foto</span>
            <span>{progresso}%</span>
          </p>
          <div
            role="progressbar"
            aria-label="Envio da foto"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso}
            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--aluno-trilho)]"
          >
            <div
              className="h-full rounded-full bg-[var(--color-brand-accent)] transition-[width] duration-200"
              style={{
                width: `${progresso}%`,
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default function EnvioFotoPainel({
  imagem,
  enviando,
  progresso,
  desabilitado,
  motivoBloqueio,
  onSelecionar,
  onExtrair,
}) {
  const idArquivo = useId()
  const idAjuda = useId()

  return (
    <div className="aluno-elevacao-1 flex min-h-[500px] flex-col rounded-xl border border-[var(--surface-border)] bg-lexis-900 px-6 pb-6 pt-4">
      <h2 className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50">
        Enviar foto da redação
      </h2>
      <p
        id={idAjuda}
        className="mt-1 text-sm leading-[22px] text-lexis-200"
      >
        Envie uma foto nítida da folha, em JPEG ou PNG de até 1 MB. A transcrição automática pode conter erros: o texto extraído aparece no editor para você revisar antes de salvar.
      </p>

      <label
        htmlFor={idArquivo}
        className="mt-6 flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--aluno-borda-campo)] bg-[var(--aluno-neutro-fundo)] px-6 py-10 text-center focus-within:border-[var(--color-brand-accent)] focus-within:ring-4 focus-within:ring-[var(--color-brand-accent)]/20"
      >
        <IconeFoto />
        <span className="break-all text-sm font-semibold leading-[22px] text-lexis-50">
          {imagem
            ? imagem.name
            : 'Escolher uma foto da redação'}
        </span>
        <span className="text-xs font-medium leading-[17px] text-lexis-200">
          {imagem
            ? formatarTamanho(imagem.size)
            : 'JPEG ou PNG, até 1 MB'}
        </span>
        <input
          id={idArquivo}
          type="file"
          accept="image/jpeg,image/png"
          aria-describedby={idAjuda}
          disabled={desabilitado || enviando}
          onChange={(evento) =>
            onSelecionar(
              evento.target.files?.[0] ?? null,
            )
          }
          className="sr-only"
        />
      </label>

      {motivoBloqueio && !enviando && (
        <p className="mt-4 rounded-lg bg-[var(--aluno-atencao-fundo)] px-3.5 py-2.5 text-xs font-medium leading-[17px] text-lexis-100">
          {motivoBloqueio}
        </p>
      )}

      {enviando && (
        <ProgressoOcr progresso={progresso} />
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onExtrair}
          disabled={
            desabilitado || enviando || !imagem
          }
          className="h-11 rounded-lg bg-[var(--color-brand-accent)] px-5 text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {enviando
            ? progresso >= 100
              ? 'Transcrevendo...'
              : 'Enviando foto...'
            : 'Extrair texto da foto'}
        </button>
      </div>
    </div>
  )
}
