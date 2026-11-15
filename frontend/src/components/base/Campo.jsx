import { useId } from 'react'

import { combinarIds } from '../../utils/combinar-ids.js'
import { CampoSenhaComOlho } from './BotaoSenha.jsx'

/*
 * Campo de formulário base (Lote 3a): rótulo, dica, erro e, para senha, o olho
 * de mostrar/ocultar. O rótulo fica sempre visível e ligado ao controle; a
 * dica e o erro entram no aria-describedby junto com o que a tela já passou.
 */

const CONTROLE =
  'w-full rounded-controle border bg-superficie-campo px-4 py-3 text-texto outline-none ' +
  'placeholder:text-texto-fraco disabled:cursor-not-allowed disabled:opacity-60 ' +
  'transition-[border-color,box-shadow] duration-[var(--rapido)] ' +
  'focus:border-foco focus:ring-2 focus:ring-foco/30'

export default function Campo({
  id: idRecebido,
  label,
  type = 'text',
  multilinha = false,
  error,
  hint,
  className = '',
  'aria-describedby': descricaoExterna,
  ref,
  ...propsDoControle
}) {
  const idGerado = useId()
  const id = idRecebido ?? idGerado
  const idErro = error ? `${id}-erro` : undefined
  const idDica = !error && hint ? `${id}-dica` : undefined
  const descricao = combinarIds(descricaoExterna, idErro, idDica) || undefined
  const classeControle = [
    CONTROLE,
    error ? 'border-erro' : 'border-borda-campo',
    className,
  ].join(' ')

  const propsComuns = {
    ...propsDoControle,
    id,
    ref,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': descricao,
    className: classeControle,
  }

  let controle

  if (multilinha) {
    controle = <textarea {...propsComuns} />
  } else if (type === 'password') {
    controle = (
      <CampoSenhaComOlho
        disabled={propsDoControle.disabled}
        renderizarCampo={(extras) => <input {...propsComuns} {...extras} />}
      />
    )
  } else {
    controle = <input {...propsComuns} type={type} />
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-texto">
        {label}
      </label>
      {controle}
      {error ? (
        <p id={idErro} className="text-sm leading-5 text-erro">
          {error}
        </p>
      ) : hint ? (
        <p id={idDica} className="text-xs leading-5 text-texto-fraco">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
