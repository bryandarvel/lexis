import { useEffect, useId, useRef } from 'react'

/*
 * Diálogo base sobre o <dialog> nativo (Lote 3a). Abre centralizado e dentro da
 * área visível, prende o foco (showModal), fecha com Escape e devolve o foco a
 * quem o abriu. Escape e clique fora chamam `onFechar`; quem decide se o
 * diálogo de fato fecha é a tela, mudando `aberto`.
 *
 * O título é um h2 em Inter (regra de títulos, D2). Ações vão em `rodape`.
 */
export default function Dialogo({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
  rodape,
  largo = false,
  fecharAoClicarFora = false,
  ocupado = false,
  className = '',
}) {
  const dialogoRef = useRef(null)
  const idTitulo = useId()
  const idDescricao = useId()

  useEffect(() => {
    const dialogo = dialogoRef.current

    if (!dialogo || !aberto) {
      return undefined
    }

    const focoAnterior = document.activeElement

    if (!dialogo.open) {
      dialogo.showModal()
    }

    return () => {
      if (dialogo.open) {
        dialogo.close()
      }

      focoAnterior?.focus?.()
    }
  }, [aberto])

  return (
    <dialog
      ref={dialogoRef}
      aria-labelledby={idTitulo}
      aria-describedby={descricao ? idDescricao : undefined}
      aria-busy={ocupado || undefined}
      className={`dialogo-base ${largo ? 'dialogo-base--largo' : ''} ${className}`}
      onCancel={(evento) => {
        evento.preventDefault()
        onFechar?.()
      }}
      onClick={(evento) => {
        if (fecharAoClicarFora && evento.target === dialogoRef.current) {
          onFechar?.()
        }
      }}
    >
      {aberto && (
        <>
          <h2 id={idTitulo} className="dialogo-base__titulo">
            {titulo}
          </h2>
          {descricao && (
            <div id={idDescricao} className="dialogo-base__descricao">
              {descricao}
            </div>
          )}
          {children && <div className="dialogo-base__corpo">{children}</div>}
          {rodape && <div className="dialogo-base__rodape">{rodape}</div>}
        </>
      )}
    </dialog>
  )
}
