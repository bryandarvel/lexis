import { useEffect, useId, useRef } from 'react'

/*
 * Diálogo base sobre o <dialog> nativo (Lote 3a). Abre centralizado e dentro da
 * área visível, prende o foco (showModal), fecha com Escape e devolve o foco a
 * quem o abriu (ou a `retornoFocoRef`, quando a tela informa um destino: use
 * quando o controle que abriu o diálogo deixa de existir ou de ser focável
 * antes de ele fechar, como um botão dentro de uma gaveta). Escape e clique fora chamam `onFechar`; quem decide se o
 * diálogo de fato fecha é a tela, mudando `aberto`. `focoInicialRef` é opcional
 * quando o primeiro controle não for o destino desejado.
 *
 * O título é um h2 em Inter (regra de títulos, D2). Ações vão em `rodape`.
 *
 * `resumo` e `rodapeSeparado` (Issue #175) são o padrão visual das
 * confirmações do fluxo da turma: um cartão com o dado em destaque logo abaixo
 * do título e um divisor antes das ações. São opcionais e, sem eles, o diálogo
 * continua exatamente como era.
 */
export default function Dialogo({
  aberto,
  onFechar,
  titulo,
  descricao,
  resumo,
  children,
  rodape,
  rodapeSeparado = false,
  largo = false,
  fecharAoClicarFora = false,
  ocupado = false,
  focoInicialRef,
  retornoFocoRef,
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
    // A tela define o destino antes de abrir o diálogo, então ele já está no ref aqui.
    const destinoInformado = retornoFocoRef?.current

    if (!dialogo.open) {
      dialogo.showModal()
    }
    focoInicialRef?.current?.focus()

    return () => {
      if (dialogo.open) {
        dialogo.close()
      }

      // Sem destino informado, o comportamento é o de sempre.
      const destino = destinoInformado ?? focoAnterior

      destino?.focus?.()
    }
  }, [aberto, focoInicialRef, retornoFocoRef])

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
          {resumo && <div className="dialogo-base__resumo">{resumo}</div>}
          {descricao && (
            <div id={idDescricao} className="dialogo-base__descricao">
              {descricao}
            </div>
          )}
          {children && <div className="dialogo-base__corpo">{children}</div>}
          {rodape && (
            <div
              className={`dialogo-base__rodape${rodapeSeparado ? ' dialogo-base__rodape--separado' : ''}`}
            >
              {rodape}
            </div>
          )}
        </>
      )}
    </dialog>
  )
}
