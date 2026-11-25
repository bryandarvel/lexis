import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { listarNotificacoes } from '../services/notificacoes.js'
import {
  observarContagemNotificacoes,
} from '../services/notification-events.js'
import {
  estadoDaContaAtual,
  marcarConta,
} from '../utils/identidade-sessao.js'
import {
  avancarGeracao,
  iniciarConsulta,
  respostaVigente,
} from '../utils/notificacoes-sequencia.js'

const INICIAL = { totalNaoLidas: 0, usuarioId: null, geracao: 0 }

// A listagem é injetável para o sino do professor usar o endpoint dele; o
// padrão continua sendo o do aluno, então o comportamento atual não muda.
//
// A contagem pertence à conta que a carregou. Depois de uma reautenticação
// como outra pessoa, o sino não pode continuar mostrando os avisos da conta
// anterior: a contagem some do render na hora e uma nova consulta começa.
// Reautenticar na mesma conta não muda o id e preserva a contagem.
//
// A contagem também chega pela central, quando alguém marca um aviso como lido.
// Essa é a mesma sequência da central: o número avisado avança a geração, então
// a resposta de uma consulta que começou antes dele é descartada em vez de
// devolver o sino ao total antigo.
export function useNotificacoesNaoLidas({
  habilitado,
  listar = listarNotificacoes,
  usuarioId = null,
}) {
  const [estado, setEstado] = useState(INICIAL)
  // Último estado conhecido, lido no momento da resposta: diz qual geração está
  // valendo agora, sem depender de quando o React executa os updaters.
  const estadoAtual = useRef(estado)
  estadoAtual.current = estado

  useEffect(() => {
    if (!habilitado) return undefined

    let ativo = true
    const controlador = new AbortController()
    const consulta = iniciarConsulta(marcarConta(INICIAL, usuarioId))

    estadoAtual.current = consulta.estado
    setEstado(consulta.estado)

    const pararObservacao =
      observarContagemNotificacoes((total) => {
        if (!ativo || !Number.isInteger(total)) return

        // Veio da central, que acabou de marcar um aviso como lido: é mais novo
        // do que qualquer consulta em voo.
        const proximo = marcarConta(
          avancarGeracao({
            ...estadoAtual.current,
            totalNaoLidas: Math.max(0, total),
          }),
          usuarioId,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
      })

    listar({ signal: controlador.signal })
      .then((resultado) => {
        // A consulta foi pedida por esta conta; se outra entrou enquanto ela
        // corria, a limpeza do efeito já passou e a resposta é descartada.
        if (!ativo) return

        // Uma leitura na central, ou outra consulta, já atualizou a contagem
        // depois desta: o número antigo não volta para a tela.
        if (!respostaVigente(estadoAtual.current, consulta.geracao)) return

        const proximo = marcarConta(
          { ...estadoAtual.current, totalNaoLidas: resultado.totalNaoLidas },
          usuarioId,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
      })
      .catch(() => {
        // A página de notificações oferece o tratamento de erro completo.
      })

    return () => {
      ativo = false
      controlador.abort()
      pararObservacao()
    }
  }, [habilitado, listar, usuarioId])

  return estadoDaContaAtual(estado, usuarioId, INICIAL).totalNaoLidas
}
