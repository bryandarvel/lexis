import { ITENS_CONFERENCIA_ENVIO } from '../../utils/essay-editor.js'

function ItemConferencia({
  item,
  marcado,
  onAlternar,
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2.5">
        <span className="relative mt-0.5 flex size-[18px] shrink-0">
          <input
            type="checkbox"
            checked={marcado}
            onChange={() => onAlternar(item.id)}
            className="peer size-[18px] cursor-pointer appearance-none rounded-md border-[1.5px] border-[var(--aluno-borda-campo)] bg-lexis-900 checked:border-[var(--color-brand-accent)] checked:bg-[var(--color-brand-accent)]"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-[#ffffff] peer-checked:block"
          >
            <path d="M5 12.5 10 17 19 7" />
          </svg>
        </span>
        <span
          className={`text-sm leading-[22px] ${
            marcado
              ? 'text-lexis-100'
              : 'text-lexis-200'
          }`}
        >
          {item.rotulo}
        </span>
      </label>
    </li>
  )
}

export default function ConferenciaEnvioCard({
  marcados,
  onAlternar,
}) {
  return (
    <section
      aria-labelledby="titulo-conferencia-envio"
      className="aluno-elevacao-1 min-h-[252px] rounded-xl border border-[var(--surface-border)] bg-lexis-900 px-5 pb-4 pt-4"
    >
      <h2
        id="titulo-conferencia-envio"
        className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50"
      >
        Antes de enviar
      </h2>
      <p
        id="ajuda-conferencia-envio"
        className="sr-only"
      >
        Conferência pessoal. Os itens não são verificados pelo LÉXIS e não impedem o envio.
      </p>

      <div
        role="group"
        aria-labelledby="titulo-conferencia-envio"
        aria-describedby="ajuda-conferencia-envio"
      >
        <ul className="mt-2.5 space-y-3">
          {ITENS_CONFERENCIA_ENVIO.map((item) => (
            <ItemConferencia
              key={item.id}
              item={item}
              marcado={Boolean(marcados[item.id])}
              onAlternar={onAlternar}
            />
          ))}
        </ul>
      </div>

      <div
        role="note"
        className="relative mt-5 overflow-hidden rounded-lg bg-[var(--aluno-atencao-fundo)] py-2.5 pl-3.5 pr-3.5"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] bg-[var(--aluno-atencao)]"
        />
        <p className="text-[13px] font-semibold leading-[18px] text-[var(--aluno-atencao)]">
          O envio é definitivo
        </p>
        <p className="mt-0.5 text-xs font-medium leading-[17px] text-lexis-100">
          Depois de entregar, o texto não pode mais ser editado.
        </p>
      </div>
    </section>
  )
}
