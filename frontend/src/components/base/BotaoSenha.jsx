import { useState } from 'react'

import { IconeOlho, IconeOlhoRiscado } from './icones.jsx'

/*
 * Botão de olho para mostrar ou ocultar a senha. Sem texto visível; o nome
 * acessível muda com o estado ("Mostrar senha" / "Ocultar senha").
 * Use dentro de um contêiner `relative`, ao lado do campo.
 */
export default function BotaoSenha({ visivel, onAlternar, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onAlternar}
      disabled={disabled}
      aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-controle text-texto-suave transition-[background-color,color] duration-[var(--rapido)] hover:bg-superficie-rebaixada hover:text-texto focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {visivel ? <IconeOlhoRiscado /> : <IconeOlho />}
    </button>
  )
}

/*
 * Campo de senha com o olho. Recebe o input pronto por `renderizarCampo`, que
 * devolve o elemento já com o `type` correto; assim cada tela mantém o estilo
 * do seu próprio input. O recuo à direita vai inline porque as folhas de
 * estilo das telas (fora de camada) vencem os utilitários do Tailwind.
 */
export function CampoSenhaComOlho({ renderizarCampo, disabled = false, className = '' }) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className={`relative ${className}`}>
      {renderizarCampo({
        type: visivel ? 'text' : 'password',
        style: { paddingRight: '3rem' },
      })}
      <BotaoSenha
        visivel={visivel}
        disabled={disabled}
        onAlternar={() => setVisivel((atual) => !atual)}
      />
    </div>
  )
}
