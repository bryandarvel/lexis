import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  Link,
  useLocation,
} from 'react-router'

import { useAvisosDoPainel } from '../../hooks/useAvisosDoPainel.js'
import { formatarData } from '../../utils/formatar-data.js'
import {
  descreverAvisosNaoLidos,
  formatarContagemDoSino,
} from '../../utils/navegacao-casca.js'
import {
  descreverContagemDoPainel,
  obterContextoDoAviso,
  selecionarAvisosRecentes,
} from '../../utils/notificacoes-painel.js'
import { IconeSino } from './icones-casca.jsx'

const CONSULTA_CELULAR = '(max-width: 767px)'
const FOCAVEIS = 'a[href], button:not(:disabled), [tabindex="0"]'

function prenderFoco(evento, dialogo) {
  const focaveis = [...(dialogo?.querySelectorAll(FOCAVEIS) ?? [])]

  if (focaveis.length === 0) return

  const primeiro = focaveis[0]
  const ultimo = focaveis[focaveis.length - 1]
  const ativo = document.activeElement
  const noTitulo = !focaveis.includes(ativo)

  if (evento.shiftKey && (ativo === primeiro || noTitulo)) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && (ativo === ultimo || noTitulo && !dialogo.contains(ativo))) {
    evento.preventDefault()
    primeiro.focus()
  }
}

function ItemDoAviso({ aviso, destino, processando, falha, onAbrir, onMarcar }) {
  const lido = Boolean(aviso.lidaEm)
  const { proposta, turma } = obterContextoDoAviso(aviso)
  const contexto = [turma, proposta].filter(Boolean).join(' · ')
  const conteudo = (
    <>
      <span aria-hidden="true" className="casca-aviso__ponto" />
      <span className="casca-aviso__texto">
        {!lido && <span className="sr-only">Não lido. </span>}
        <strong className="casca-aviso__titulo">{aviso.titulo}</strong>
        <span className="casca-aviso__mensagem">{aviso.mensagem}</span>
        {contexto && <span className="casca-aviso__contexto">{contexto}</span>}
        <time
          dateTime={aviso.criadaEm}
          title={formatarData(aviso.criadaEm, 'dataHora', { vazio: '' })}
          className="casca-aviso__data"
        >
          {formatarData(aviso.criadaEm, 'relativa', { vazio: '' })}
        </time>
      </span>
    </>
  )

  return (
    <li className="casca-aviso" data-lido={lido}>
      {destino ? (
        <Link
          to={destino}
          className="casca-aviso__corpo"
          onClick={(evento) => onAbrir(evento, aviso)}
        >
          {conteudo}
        </Link>
      ) : (
        <div className="casca-aviso__corpo">{conteudo}</div>
      )}

      {!lido && (
        <button
          type="button"
          disabled={processando}
          aria-busy={processando || undefined}
          onClick={() => onMarcar(aviso)}
          className="casca-aviso__marcar"
        >
          {processando ? 'Marcando…' : 'Marcar como lida'}
        </button>
      )}

      {falha && (
        <p role="alert" className="casca-aviso__falha">{falha}</p>
      )}
    </li>
  )
}

function EsqueletoDosAvisos() {
  return (
    <div aria-hidden="true" className="casca-avisos__esqueleto">
      {[1, 2, 3].map((item) => (
        <span key={item} className="casca-avisos__esqueleto-linha" />
      ))}
    </div>
  )
}

/*
 * Sino da casca (UX-009) com a central de avisos (Lote 5, §9B). O botão abre
 * um painel com os dez avisos mais recentes e a página completa continua
 * existindo em `rotaTodas`.
 *
 * - Computador: painel ancorado ao sino, não modal. Escape, clique fora, novo
 *   clique no sino e mudança de rota fecham; Escape e o sino devolvem o foco.
 * - Abaixo de 768 px: folha de tela cheia e modal (<dialog>.showModal), com
 *   "Fechar", fundo inerte, foco preso e rolagem do fundo travada.
 * - Abrir o painel só consulta. Abrir um aviso com destino marca como lido e
 *   navega; se a marcação falhar, navega do mesmo jeito.
 */
export default function Sino({
  total,
  usuarioId,
  rotaTodas,
  textoVazio,
  listar,
  marcarLida,
  descrever,
}) {
  const idPainel = useId()
  const idTitulo = useId()
  const { pathname } = useLocation()
  const [aberto, setAberto] = useState(false)
  const [modal, setModal] = useState(false)
  const botaoRef = useRef(null)
  const dialogoRef = useRef(null)
  const tituloRef = useRef(null)
  const abertoRef = useRef(false)
  abertoRef.current = aberto

  const { visivel, recarregar, marcar } = useAvisosDoPainel({
    aberto,
    listar,
    marcarLida,
    usuarioId,
  })

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false)

    if (devolverFoco) botaoRef.current?.focus()
  }, [])

  function alternar() {
    if (aberto) {
      fechar()
      return
    }

    setModal(Boolean(globalThis.matchMedia?.(CONSULTA_CELULAR)?.matches))
    setAberto(true)
  }

  // Abre o <dialog> no modo certo e leva o foco ao título. O que o navegador
  // faz sozinho em showModal (foco, inércia do fundo) vale só para a folha.
  useEffect(() => {
    const dialogo = dialogoRef.current

    if (!aberto || !dialogo) return undefined

    if (!dialogo.open) {
      if (modal) dialogo.showModal()
      else dialogo.show()
    }

    tituloRef.current?.focus()

    return () => {
      if (dialogo.open) dialogo.close()
    }
  }, [aberto, modal])

  useEffect(() => {
    if (!aberto) return undefined

    function aoTeclar(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        fechar()
        return
      }

      // O <dialog> modal deixa o Tab sair para o navegador: na folha o foco
      // dá a volta dentro dela.
      if (evento.key === 'Tab' && modal) prenderFoco(evento, dialogoRef.current)
    }

    function aoPressionar(evento) {
      if (modal) return

      const alvo = evento.target

      if (
        dialogoRef.current?.contains(alvo) ||
        botaoRef.current?.contains(alvo)
      ) {
        return
      }

      // Clicou em outro controle: o foco fica onde ele pediu.
      fechar(false)
    }

    function aoMudarTela(evento) {
      if (evento.matches !== modal) fechar(false)
    }

    const consulta = globalThis.matchMedia?.(CONSULTA_CELULAR)

    // Na aba que volta a ficar visível a lista é consultada de novo.
    function aoVoltarAba() {
      if (document.visibilityState === 'visible') recarregar()
    }

    document.addEventListener('keydown', aoTeclar)
    document.addEventListener('pointerdown', aoPressionar)
    document.addEventListener('visibilitychange', aoVoltarAba)
    consulta?.addEventListener('change', aoMudarTela)

    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('pointerdown', aoPressionar)
      document.removeEventListener('visibilitychange', aoVoltarAba)
      consulta?.removeEventListener('change', aoMudarTela)
    }
  }, [aberto, modal, fechar, recarregar])

  // A folha cobre a tela: o fundo não rola enquanto ela está aberta.
  useEffect(() => {
    if (!aberto || !modal) return undefined

    const anterior = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = anterior
    }
  }, [aberto, modal])

  // Mudança de rota ou de conta fecha o painel.
  useEffect(() => {
    if (abertoRef.current) setAberto(false)
  }, [pathname, usuarioId])

  function abrirAviso(evento, aviso) {
    // Ctrl, Shift, botão do meio e afins deixam o navegador abrir a nova aba:
    // nesse caso o painel continua onde está.
    const simples =
      evento.button === 0 &&
      !evento.metaKey &&
      !evento.ctrlKey &&
      !evento.shiftKey &&
      !evento.altKey

    // A leitura segue em segundo plano. Se falhar, o aviso continua não lido
    // e a navegação acontece do mesmo jeito.
    if (!aviso.lidaEm) marcar(aviso, { ocupar: false })
    if (simples) fechar()
  }

  const avisos = selecionarAvisosRecentes(visivel.notificacoes)
  const primeiraCarga = !visivel.carregado && visivel.status !== 'erro'
  const semLista = !visivel.carregado && visivel.status === 'erro'
  const contagem = visivel.carregado ? visivel.totalNaoLidas : total

  return (
    <div className="casca-sino-conjunto">
      <button
        ref={botaoRef}
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-haspopup="dialog"
        aria-label={descreverAvisosNaoLidos(total)}
        onClick={alternar}
        className="casca-sino"
      >
        <span className="casca-sino-icone">
          <IconeSino />
        </span>
        {total > 0 && (
          <span aria-hidden="true" className="casca-sino-contagem">
            {formatarContagemDoSino(total)}
          </span>
        )}
      </button>

      <dialog
        ref={dialogoRef}
        id={idPainel}
        aria-labelledby={idTitulo}
        data-modal={modal}
        className="casca-avisos"
        onCancel={(evento) => {
          evento.preventDefault()
          fechar()
        }}
      >
        {aberto && (
          <>
            <header className="casca-avisos__cabecalho">
              <div>
                <h2
                  ref={tituloRef}
                  id={idTitulo}
                  tabIndex={-1}
                  className="casca-avisos__titulo"
                >
                  Notificações
                </h2>
                <p role="status" className="casca-avisos__contagem">
                  {descreverContagemDoPainel(contagem)}
                </p>
              </div>
              {modal && (
                <button
                  type="button"
                  onClick={() => fechar()}
                  className="casca-avisos__fechar"
                >
                  Fechar
                </button>
              )}
            </header>

            <div
              aria-busy={visivel.status === 'carregando'}
              className="casca-avisos__corpo"
            >
              {primeiraCarga && (
                <>
                  <span role="status" className="sr-only">
                    Carregando avisos…
                  </span>
                  <EsqueletoDosAvisos />
                </>
              )}

              {semLista && (
                <div className="casca-avisos__estado">
                  <p role="alert">{visivel.mensagem}</p>
                  <button
                    type="button"
                    onClick={recarregar}
                    className="casca-avisos__acao"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {visivel.carregado && visivel.status === 'erro' && (
                <div className="casca-avisos__erro">
                  <p role="alert">
                    Não foi possível atualizar a lista. Estes são os avisos
                    da última consulta.
                  </p>
                  <button
                    type="button"
                    onClick={recarregar}
                    className="casca-avisos__acao"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {visivel.carregado && avisos.length === 0 && (
                <div className="casca-avisos__estado">
                  <p className="casca-avisos__vazio-titulo">
                    Nenhum aviso por enquanto
                  </p>
                  <p>{textoVazio}</p>
                </div>
              )}

              {visivel.carregado && avisos.length > 0 && (
                <ul className="casca-avisos__lista">
                  {avisos.map((aviso) => (
                    <ItemDoAviso
                      key={aviso.id}
                      aviso={aviso}
                      destino={descrever(aviso).destino}
                      processando={visivel.processandoId === aviso.id}
                      falha={
                        visivel.falhaItem?.id === aviso.id
                          ? visivel.falhaItem.mensagem
                          : null
                      }
                      onAbrir={abrirAviso}
                      onMarcar={marcar}
                    />
                  ))}
                </ul>
              )}
            </div>

            <footer className="casca-avisos__rodape">
              <Link
                to={rotaTodas}
                onClick={() => fechar(false)}
                className="casca-avisos__todas"
              >
                Ver todas
              </Link>
            </footer>
          </>
        )}
      </dialog>
    </div>
  )
}
