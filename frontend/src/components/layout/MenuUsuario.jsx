import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router'

import Botao from '../base/Botao.jsx'
import { obterIniciais } from '../../utils/aluno-painel.js'

/*
 * Menu do usuário da casca: o mesmo nos dois papéis (UX-010). Mostra nome e
 * e-mail, leva ao Perfil e contém "Sair". "Minha turma" só aparece quando a
 * casca informa `onAbrirMinhaTurma` (aluno).
 */
export default function MenuUsuario({
  usuario,
  nomePadrao,
  rotaPerfil,
  saindo,
  onSair,
  onAbrirMinhaTurma,
  botaoRef,
}) {
  const [aberto, setAberto] = useState(false)
  const painelRef = useRef(null)
  const idPainel = useId()
  const nome = usuario?.nome ?? nomePadrao

  useEffect(() => {
    if (!aberto) return undefined

    function fecharComEscape(evento) {
      if (evento.key === 'Escape') {
        setAberto(false)
        botaoRef.current?.focus()
      }
    }

    function fecharAoClicarFora(evento) {
      if (
        !painelRef.current?.contains(evento.target) &&
        !botaoRef.current?.contains(evento.target)
      ) {
        setAberto(false)
      }
    }

    document.addEventListener('keydown', fecharComEscape)
    document.addEventListener('pointerdown', fecharAoClicarFora)

    return () => {
      document.removeEventListener('keydown', fecharComEscape)
      document.removeEventListener('pointerdown', fecharAoClicarFora)
    }
  }, [aberto, botaoRef])

  return (
    <div className="casca-menu">
      <button
        ref={botaoRef}
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={`Menu do usuário: ${nome}`}
        onClick={() => setAberto((atual) => !atual)}
        className="casca-avatar-botao"
      >
        <span aria-hidden="true" className="casca-avatar">
          {obterIniciais(usuario?.nome)}
        </span>
      </button>

      {aberto && (
        <div ref={painelRef} id={idPainel} className="casca-menu-painel">
          <p className="casca-menu-nome">{nome}</p>
          {usuario?.email && (
            <p className="casca-menu-email">{usuario.email}</p>
          )}

          <div className="casca-menu-acoes">
            <Botao
              as={Link}
              to={rotaPerfil}
              onClick={() => setAberto(false)}
              variante="secundario"
              tamanho="compacto"
              className="w-full"
            >
              Perfil
            </Botao>

            {onAbrirMinhaTurma && (
              <Botao
                type="button"
                onClick={() => {
                  setAberto(false)
                  onAbrirMinhaTurma()
                }}
                variante="secundario"
                tamanho="compacto"
                className="w-full"
              >
                Minha turma
              </Botao>
            )}

            <Botao
              type="button"
              disabled={saindo}
              onClick={onSair}
              variante="secundario"
              tamanho="compacto"
              className="w-full"
            >
              {saindo ? 'Saindo…' : 'Sair'}
            </Botao>
          </div>
        </div>
      )}
    </div>
  )
}
