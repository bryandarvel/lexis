import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import {
  listarNotificacoesProfessor,
  marcarNotificacaoProfessorLida,
} from '../../services/notificacoes-professor.js'
import { notificarContagemAtualizada } from '../../services/notification-events.js'
import {
  descreverAvisoProfessor,
  mensagemDeFalha,
} from '../../utils/notificacoes-professor.js'
import {
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
} from '../../utils/identidade-sessao.js'
import {
  aplicarConsulta,
  aplicarFalhaDaConsulta,
  aplicarLeitura,
  geracaoDe,
  iniciarConsulta,
} from '../../utils/notificacoes-sequencia.js'
import { respostaDeveSerAplicada } from '../../utils/resposta-notificacoes.js'
import './professor-notificacoes.css'

function formatarDataHora(valor) {
  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

const INICIAL = {
  usuarioId: null,
  geracao: 0,
  status: 'carregando',
  notificacoes: [],
  totalNaoLidas: 0,
  processandoId: null,
  mensagem: '',
}

export default function ProfessorNotificacoesPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const usuarioId = usuario?.id
  const montado = useRef(true)
  // Lido no momento da resposta: diz de quem é a sessão agora, e não de quem
  // era quando a requisição começou.
  const contaAtual = useRef(usuarioId)
  contaAtual.current = usuarioId
  const [estado, setEstado] = useState(INICIAL)
  // Último estado renderizado: a contagem do sino sai dele, e não de dentro de um updater do setState,
  // que o React executa depois (foi isso que deixava o sino em 0 com 1 aviso ainda não lido).
  const estadoAtual = useRef(estado)
  estadoAtual.current = estado
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    montado.current = true

    const controlador = new AbortController()

    // Esta consulta recebe um número que continua de onde o anterior parou: duas consultas
    // seguidas, ou de contas diferentes, nunca recebem o mesmo. Se uma leitura local ou outra
    // consulta acontecer antes da resposta, ela deixa de ser a vigente e o resultado é descartado.
    const consulta = iniciarConsulta({
      ...marcarConta(INICIAL, usuarioId),
      geracao: geracaoDe(estadoAtual.current),
    })
    // A conta que pediu esta consulta, conferida quando a resposta chegar.
    const contaDaConsulta = usuarioId
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

    listarNotificacoesProfessor({ signal: controlador.signal })
      .then((resultado) => {
        // Cancelada, substituída ou de outra conta: não entra na lista nem avisa o sino.
        if (!podeAplicar()) return

        const proximo = marcarConta(
          aplicarConsulta(estadoAtual.current, resultado, consulta.geracao),
          contaDaConsulta,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
        notificarContagemAtualizada(proximo.totalNaoLidas)
      })
      .catch((erro) => {
        // A falha segue a mesma regra: uma consulta vencida não escreve erro na tela de ninguém.
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
      montado.current = false
      controlador.abort()
    }
  }, [tentativa, usuarioId])

  const abrirAviso = useCallback(
    async (notificacao) => {
      const { destino } = descreverAvisoProfessor(notificacao)
      // Conta que pediu a ação. Se outra pessoa entrar antes da resposta,
      // nada do que voltar pode mexer na tela dela.
      const contaDaAcao = usuarioId

      if (notificacao.lidaEm) {
        if (destino) navigate(destino)
        return
      }

      setEstado((atual) => ({
        ...atual,
        processandoId: notificacao.id,
        mensagem: '',
      }))

      try {
        const atualizada = await marcarNotificacaoProfessorLida(
          notificacao.id,
        )

        if (!montado.current) return
        if (!mesmaConta(contaDaAcao, contaAtual.current)) return

        // Uma única contagem, derivada da lista, para a lista e para o sino.
        const proximo = marcarConta(
          aplicarLeitura(estadoAtual.current, atualizada),
          contaDaAcao,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
        notificarContagemAtualizada(proximo.totalNaoLidas)

        if (destino) navigate(destino)
      } catch (erro) {
        if (!montado.current) return
        if (!mesmaConta(contaDaAcao, contaAtual.current)) return

        setEstado((atual) => marcarConta({
          ...atual,
          processandoId: null,
          mensagem: mensagemDeFalha(
            erro,
            'Não foi possível marcar o aviso como lido. Tente novamente.',
          ),
        }, contaDaAcao))
      }
    },
    [navigate, usuarioId],
  )

  // O que não é da conta atual não aparece: na troca de pessoa a lista, a
  // contagem e o aviso de erro somem na hora, antes da nova consulta terminar.
  const visivel = estadoDaContaAtual(estado, usuarioId, INICIAL)

  return (
    <ProfessorWorkspaceLayout secao="Notificações">
      <motion.main
        id="panel-main"
        tabIndex={-1}
        className="panel-main avisos-main"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <h1>Notificações</h1>
        <p className="panel-subtitle">
          Avisos sobre as redações recebidas e suas turmas.
        </p>

        {visivel.mensagem && (
          <p className="avisos-erro" role="alert">
            {visivel.mensagem}
          </p>
        )}

        {visivel.status === 'carregando' && (
          <p role="status" className="panel-subtitle avisos-carregando">
            Carregando seus avisos…
          </p>
        )}

        {visivel.status === 'erro' && (
          <section className="avisos-vazio" aria-labelledby="avisos-erro-titulo">
            <h2 id="avisos-erro-titulo">Avisos indisponíveis</h2>
            <p>Verifique sua conexão e tente novamente.</p>
            <button
              type="button"
              className="panel-primary-button"
              onClick={() => setTentativa((valor) => valor + 1)}
            >
              Tentar novamente
            </button>
          </section>
        )}

        {visivel.status === 'pronto' && visivel.notificacoes.length === 0 && (
          <section className="avisos-vazio" aria-labelledby="avisos-vazio-titulo">
            <h2 id="avisos-vazio-titulo">Nenhum aviso por enquanto</h2>
            <p>
              Quando um aluno enviar uma redação, o aviso aparece aqui.
            </p>
          </section>
        )}

        {visivel.status === 'pronto' && visivel.notificacoes.length > 0 && (
          <>
            <p role="status" className="avisos-contagem">
              {visivel.totalNaoLidas === 0
                ? 'Nenhum aviso não lido.'
                : visivel.totalNaoLidas === 1
                  ? '1 aviso não lido.'
                  : `${visivel.totalNaoLidas} avisos não lidos.`}
            </p>

            <ul className="avisos-lista">
              {visivel.notificacoes.map((notificacao) => {
                const aviso = descreverAvisoProfessor(notificacao)
                const processando = visivel.processandoId === notificacao.id
                const lido = Boolean(notificacao.lidaEm)

                return (
                  <li key={notificacao.id}>
                    <button
                      type="button"
                      className={`avisos-item${lido ? '' : ' nao-lido'}`}
                      disabled={
                        Boolean(visivel.processandoId) || !aviso.acionavel
                      }
                      onClick={() => abrirAviso(notificacao)}
                    >
                      <span className="avisos-item-topo">
                        <strong>{notificacao.titulo}</strong>
                        <span className="avisos-data">
                          {formatarDataHora(notificacao.criadaEm)}
                        </span>
                      </span>

                      {/* Não lido tem rótulo, e não só a cor da borda. */}
                      {!lido && (
                        <span className="avisos-marca">Não lido</span>
                      )}

                      <span className="avisos-mensagem">
                        {notificacao.mensagem}
                      </span>

                      {aviso.orientacao && (
                        <span className="avisos-origem">{aviso.orientacao}</span>
                      )}

                      {(aviso.proposta || aviso.turma) && (
                        <span className="avisos-origem">
                          {[aviso.proposta, aviso.turma]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}

                      <span className="avisos-acao">
                        {processando ? aviso.rotuloProcessando : aviso.rotulo}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </motion.main>
    </ProfessorWorkspaceLayout>
  )
}
