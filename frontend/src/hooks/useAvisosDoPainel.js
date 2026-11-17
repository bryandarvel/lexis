import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { notificarContagemAtualizada } from '../services/notification-events.js'
import {
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
} from '../utils/identidade-sessao.js'
import {
  aplicarConsulta,
  aplicarFalhaDaConsulta,
  aplicarLeitura,
  geracaoDe,
  iniciarConsulta,
} from '../utils/notificacoes-sequencia.js'
import { mensagemDeFalha } from '../utils/notificacoes-professor.js'
import { respostaDeveSerAplicada } from '../utils/resposta-notificacoes.js'

// `carregado` distingue a primeira abertura (esqueleto) das seguintes, em que a
// lista anterior continua na tela enquanto a nova chega.
const INICIAL = {
  usuarioId: null,
  geracao: 0,
  status: 'carregando',
  carregado: false,
  notificacoes: [],
  totalNaoLidas: 0,
  processandoId: null,
  mensagem: '',
  falhaItem: null,
}

/*
 * Lista de avisos do painel do sino (Lote 5, §9B). Usa a mesma sequência de
 * consultas das páginas de notificações: a contagem sai sempre da lista, uma
 * leitura descarta a consulta em voo e a resposta de outra conta nunca chega
 * à tela. Abrir o painel reconsulta e não marca nada; marcar como lida é uma
 * ação à parte, e o número novo vai ao sino pelo evento de contagem.
 */
export function useAvisosDoPainel({
  aberto,
  listar,
  marcarLida,
  usuarioId,
}) {
  const [estado, setEstado] = useState(INICIAL)
  const [tentativa, setTentativa] = useState(0)
  const estadoAtual = useRef(estado)
  estadoAtual.current = estado
  const contaAtual = useRef(usuarioId)
  contaAtual.current = usuarioId
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true

    return () => {
      montado.current = false
    }
  }, [])

  // Troca de pessoa: a lista da conta anterior é descartada na hora. Nada de
  // memória da conta antiga sobrevive a uma consulta em voo, que o efeito de
  // consulta aborta ao reiniciar.
  useEffect(() => {
    if (mesmaConta(estadoAtual.current.usuarioId, usuarioId)) return

    const limpo = marcarConta(
      { ...INICIAL, geracao: geracaoDe(estadoAtual.current) },
      usuarioId,
    )

    estadoAtual.current = limpo
    setEstado(limpo)
  }, [usuarioId])

  useEffect(() => {
    if (!aberto || !usuarioId) return undefined

    const controlador = new AbortController()
    const contaDaConsulta = usuarioId
    const base = estadoDaContaAtual(estadoAtual.current, usuarioId, {
      ...INICIAL,
      geracao: geracaoDe(estadoAtual.current),
    })
    const consulta = iniciarConsulta(marcarConta(base, usuarioId))
    const podeAplicar = () => respostaDeveSerAplicada({
      montado: montado.current,
      cancelada: controlador.signal.aborted,
      contaDaConsulta,
      contaAtual: contaAtual.current,
      estadoAtual: estadoAtual.current,
      geracao: consulta.geracao,
    })

    estadoAtual.current = consulta.estado
    setEstado(consulta.estado)

    listar({ signal: controlador.signal })
      .then((resultado) => {
        if (!podeAplicar()) return

        const proximo = marcarConta(
          {
            ...aplicarConsulta(
              estadoAtual.current,
              resultado,
              consulta.geracao,
            ),
            carregado: true,
          },
          contaDaConsulta,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
        notificarContagemAtualizada(proximo.totalNaoLidas)
      })
      .catch((erro) => {
        if (!podeAplicar()) return

        const proximo = marcarConta(
          aplicarFalhaDaConsulta(
            estadoAtual.current,
            mensagemDeFalha(erro, 'Não foi possível carregar seus avisos.'),
            consulta.geracao,
          ),
          contaDaConsulta,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
      })

    return () => {
      controlador.abort()
    }
  }, [aberto, listar, tentativa, usuarioId])

  const recarregar = useCallback(() => {
    setTentativa((valor) => valor + 1)
  }, [])

  // `ocupar` mostra o botão ocupado e a falha no item ("Marcar como lida"). Sem
  // ele, é a leitura silenciosa de quem abre um aviso com destino: se falhar, o
  // aviso continua não lido e a navegação segue do mesmo jeito. A resposta pode
  // chegar depois de o painel fechar ou da página mudar; a contagem do sino é
  // atualizada de qualquer forma, desde que a conta seja a mesma.
  const marcar = useCallback(
    async (notificacao, { ocupar = true } = {}) => {
      if (!notificacao || notificacao.lidaEm) return true

      const contaDaAcao = usuarioId

      if (ocupar) {
        const ocupado = {
          ...estadoAtual.current,
          processandoId: notificacao.id,
          mensagem: '',
          falhaItem: null,
        }

        estadoAtual.current = ocupado
        setEstado(ocupado)
      }

      try {
        const atualizada = await marcarLida(notificacao.id)

        if (!mesmaConta(contaDaAcao, contaAtual.current)) return false

        const proximo = marcarConta(
          { ...aplicarLeitura(estadoAtual.current, atualizada), falhaItem: null },
          contaDaAcao,
        )

        estadoAtual.current = proximo
        if (montado.current) setEstado(proximo)
        notificarContagemAtualizada(proximo.totalNaoLidas)

        return true
      } catch (erro) {
        if (ocupar && montado.current && mesmaConta(contaDaAcao, contaAtual.current)) {
          const falho = marcarConta({
            ...estadoAtual.current,
            processandoId: null,
            falhaItem: {
              id: notificacao.id,
              mensagem: mensagemDeFalha(
                erro,
                'Não foi possível marcar o aviso como lido. Tente novamente.',
              ),
            },
          }, contaDaAcao)

          estadoAtual.current = falho
          setEstado(falho)
        }

        return false
      }
    },
    [marcarLida, usuarioId],
  )

  return {
    visivel: estadoDaContaAtual(estado, usuarioId, INICIAL),
    recarregar,
    marcar,
  }
}
