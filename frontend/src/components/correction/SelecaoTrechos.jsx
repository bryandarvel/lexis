import { useId, useRef, useState } from 'react'

import { obterTomCriterio } from '../../utils/criterio-cores.js'
import {
  LIMITE_TRECHOS_POR_CRITERIO,
  criarTrechoDaSelecao,
  podeAcrescentarTrecho,
  validarTrechosRecebidos,
} from '../../utils/trechos-feedback.js'
import './selecao-trechos.css'

/*
 * Seleção e aprovação de trechos de um critério (#42).
 *
 * Componente isolado: ainda não está ligado a nenhuma tela, porque a correção
 * do professor é código compartilhado e depende do aval do Bryan. Recebe e
 * devolve apenas listas de {inicio, fim, trecho, analiseIaId?}; quem o usar
 * decide quando salvar e envia pelo util, sem campos proibidos.
 *
 * `onAlterar` é chamado a cada mudança, e a tela que integrar deve marcar o
 * critério como alterado, para o envio mandar a lista em vez de omiti-la.
 */
export default function SelecaoTrechos({
  texto = '',
  criterio,
  trechos = [],
  sugestoes = [],
  salvando = false,
  onAlterar,
}) {
  const idAviso = useId()
  const listaRef = useRef(null)
  const [aviso, setAviso] = useState('')

  const tom = obterTomCriterio(criterio)
  const marcados = validarTrechosRecebidos(texto, trechos)
  // Um trecho pode ter deixado de coincidir depois de o texto mudar.
  const invalidos = trechos.length - marcados.length
  const disponiveis = validarTrechosRecebidos(texto, sugestoes).filter(
    (sugestao) =>
      !marcados.some(
        (item) => item.inicio === sugestao.inicio && item.fim === sugestao.fim,
      ),
  )
  const cheio = marcados.length >= LIMITE_TRECHOS_POR_CRITERIO

  function devolver(proximos, mensagem = '') {
    setAviso(mensagem)
    onAlterar?.(proximos)
  }

  function acrescentar(novo) {
    const impedimento = podeAcrescentarTrecho(marcados, novo)

    if (impedimento) {
      setAviso(impedimento)
      return
    }

    devolver([...marcados, novo])
  }

  function marcarSelecao() {
    const selecao = globalThis.getSelection?.()
    const alvo = listaRef.current?.closest('[data-texto-redacao]')

    if (!selecao || selecao.isCollapsed || !alvo) {
      setAviso('Selecione um trecho no texto da redação.')
      return
    }

    const inicio = Number(selecao.anchorNode?.parentElement?.dataset?.inicio ?? Number.NaN)
    const posicao = Number.isInteger(inicio) ? inicio : 0
    const { trecho, erro } = criarTrechoDaSelecao(
      texto,
      posicao + selecao.anchorOffset,
      posicao + selecao.focusOffset,
    )

    if (!trecho) {
      setAviso(erro)
      return
    }

    acrescentar(trecho)
  }

  function remover(alvo) {
    devolver(
      marcados.filter(
        (item) => !(item.inicio === alvo.inicio && item.fim === alvo.fim),
      ),
    )
  }

  return (
    <section
      className={`trechos-painel review-tone-${tom}`}
      aria-labelledby={`${idAviso}-titulo`}
    >
      <div className="trechos-cabecalho">
        <h4 id={`${idAviso}-titulo`}>
          Trechos de {criterio?.nome ?? 'critério'}
        </h4>
        <p className="trechos-contador" aria-live="polite">
          {marcados.length} de {LIMITE_TRECHOS_POR_CRITERIO}
        </p>
      </div>

      <button
        type="button"
        className="trechos-botao"
        disabled={salvando || cheio}
        onClick={marcarSelecao}
      >
        Marcar trecho selecionado
      </button>

      {cheio && (
        <p className="trechos-aviso" role="status">
          Limite de {LIMITE_TRECHOS_POR_CRITERIO} trechos atingido. Remova um
          para marcar outro.
        </p>
      )}

      {invalidos > 0 && (
        <p className="trechos-aviso trechos-aviso-atencao" role="status">
          {invalidos === 1
            ? '1 trecho não corresponde mais ao texto e não será salvo.'
            : `${invalidos} trechos não correspondem mais ao texto e não serão salvos.`}
        </p>
      )}

      {aviso && (
        <p className="trechos-aviso trechos-aviso-atencao" role="alert">
          {aviso}
        </p>
      )}

      {disponiveis.length > 0 && (
        <>
          <h5 className="trechos-subtitulo">Sugestões da análise</h5>
          <ul className="trechos-lista">
            {disponiveis.map((sugestao) => (
              <li key={`${sugestao.inicio}-${sugestao.fim}`}>
                <span className="trechos-texto">{sugestao.trecho}</span>
                <button
                  type="button"
                  className="trechos-acao"
                  disabled={salvando || cheio}
                  onClick={() => acrescentar(sugestao)}
                >
                  Aprovar
                  <span className="sr-only"> o trecho {sugestao.trecho}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h5 className="trechos-subtitulo">Marcados</h5>
      {marcados.length === 0 ? (
        <p className="trechos-vazio">
          Nenhum trecho marcado neste critério.
        </p>
      ) : (
        <ul className="trechos-lista" ref={listaRef}>
          {marcados.map((item) => (
            <li key={`${item.inicio}-${item.fim}`}>
              <span className="trechos-texto">{item.trecho}</span>
              <button
                type="button"
                className="trechos-acao trechos-acao-remover"
                disabled={salvando}
                onClick={() => remover(item)}
              >
                Remover
                <span className="sr-only"> o trecho {item.trecho}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
