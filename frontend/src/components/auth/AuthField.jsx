import { useState } from 'react'

export default function AuthField({
  id,
  label,
  type = 'text',
  error,
  hint,
  ...inputProps
}) {
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const permiteAlternarSenha = type === 'password'
  const tipoExibido =
    permiteAlternarSenha && senhaVisivel
      ? 'text'
      : type

  const descricaoId = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-lexis-100"
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...inputProps}
          id={id}
          type={tipoExibido}
          aria-invalid={Boolean(error)}
          aria-describedby={descricaoId}
          className={`w-full rounded-xl border bg-lexis-950/55 px-4 py-3 text-lexis-50 outline-none transition placeholder:text-lexis-300/55 focus:ring-4 ${
            error
              ? 'border-red-300/75 focus:border-red-300 focus:ring-red-300/15'
              : 'border-lexis-300/25 focus:border-lexis-300 focus:ring-lexis-300/15'
          } ${permiteAlternarSenha ? 'pr-24' : ''}`}
        />

        {permiteAlternarSenha && (
          <button
            type="button"
            onClick={() => {
              setSenhaVisivel((valorAtual) => !valorAtual)
            }}
            className="absolute inset-y-0 right-3 my-auto h-fit rounded-md px-2 py-1 text-xs font-semibold text-lexis-200 transition hover:bg-lexis-400/10 hover:text-lexis-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lexis-300"
            aria-label={
              senhaVisivel
                ? 'Ocultar senha'
                : 'Mostrar senha'
            }
          >
            {senhaVisivel ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>

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
