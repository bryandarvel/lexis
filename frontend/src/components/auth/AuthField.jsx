import { CampoSenhaComOlho } from '../base/BotaoSenha.jsx'

export default function AuthField({
  id,
  label,
  type = 'text',
  error,
  hint,
  'aria-describedby': descricaoExterna,
  ...inputProps
}) {
  const permiteAlternarSenha = type === 'password'

  const descricaoId = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined

  // Une o aria-describedby recebido da tela (por exemplo, a regra de senha) ao
  // id do erro ou da dica do próprio campo, sem repetir ids.
  const descricaoIds = [
    ...new Set(
      [descricaoExterna, descricaoId]
        .filter(Boolean)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean),
    ),
  ].join(' ')

  // `extras` traz o type e, no campo de senha, o recuo para o olho.
  const renderizarInput = (extras) => (
    <input
      {...inputProps}
      {...extras}
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={descricaoIds || undefined}
      className={`w-full rounded-xl border bg-lexis-950/55 px-4 py-3 text-lexis-50 outline-none transition placeholder:text-lexis-300/55 focus:ring-4 ${
        error
          ? 'border-red-300/75 focus:border-red-300 focus:ring-red-300/15'
          : 'border-lexis-300/25 focus:border-lexis-300 focus:ring-lexis-300/15'
      }`}
    />
  )

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-lexis-100"
      >
        {label}
      </label>

      {permiteAlternarSenha ? (
        <CampoSenhaComOlho
          disabled={inputProps.disabled}
          renderizarCampo={renderizarInput}
        />
      ) : (
        renderizarInput({ type })
      )}

      {error ? (
        <p
          id={`${id}-error`}
          className="text-sm text-red-200"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="text-xs leading-5 text-lexis-300"
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
