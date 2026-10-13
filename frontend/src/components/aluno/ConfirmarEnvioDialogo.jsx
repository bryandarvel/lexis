import {
  useEffect,
  useRef,
} from 'react'

export default function ConfirmarEnvioDialogo({
  aberto,
  extensao,
  pendentes,
  onCancelar,
  onConfirmar,
}) {
  const dialogoRef = useRef(null)

  useEffect(() => {
    const dialogo = dialogoRef.current

    if (!dialogo) return

    if (aberto && !dialogo.open) {
      dialogo.showModal()
    }

    if (!aberto && dialogo.open) {
      dialogo.close()
    }
  }, [aberto])

  return (
    <dialog
      ref={dialogoRef}
      aria-labelledby="titulo-confirmar-envio"
      aria-describedby="descricao-confirmar-envio"
      onCancel={(evento) => {
        evento.preventDefault()
        onCancelar()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[var(--surface-border)] bg-lexis-900 p-6 text-lexis-50 backdrop:bg-[rgba(3,12,24,0.6)]"
    >
      <h2
        id="titulo-confirmar-envio"
        className="aluno-titulo-interface text-xl font-semibold leading-[26px] tracking-[-0.16px]"
      >
        Enviar a redação?
      </h2>
      <p
        id="descricao-confirmar-envio"
        className="mt-2 text-sm leading-[22px] text-lexis-200"
      >
        O envio é definitivo: depois de entregar, o texto não pode mais ser editado.
      </p>
      <p className="mt-4 text-sm font-medium leading-[22px] text-lexis-100">
        {extensao}
      </p>

      {pendentes.length > 0 && (
        <div className="mt-4 rounded-lg bg-[var(--aluno-neutro-fundo)] p-3">
          <p className="text-xs font-semibold leading-[17px] text-lexis-100">
            Itens não marcados em “Antes de enviar”:
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs leading-[17px] text-lexis-200">
            {pendentes.map((item) => (
              <li key={item.id}>{item.rotulo}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-[17px] text-lexis-200">
            A conferência é pessoal e não impede o envio.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancelar}
          className="h-11 rounded-lg border border-[var(--aluno-borda-campo)] px-5 text-[13px] font-semibold leading-[18px] text-lexis-100 transition-colors hover:bg-[var(--aluno-neutro-fundo)]"
        >
          Voltar ao texto
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className="h-11 rounded-lg bg-[var(--color-brand-accent)] px-5 text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110"
        >
          Enviar definitivamente
        </button>
      </div>
    </dialog>
  )
}
