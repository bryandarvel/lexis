import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useNavigate,
} from 'react-router'

import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import {
  listarNotificacoes,
  marcarNotificacaoLida,
} from '../../services/notificacoes.js'
import {
  notificarContagemAtualizada,
} from '../../services/notification-events.js'
import { descreverAcaoNotificacao } from '../../utils/notifications.js'
import {
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
} from '../../utils/identidade-sessao.js'
import {
  aplicarConsulta,
  aplicarFalhaDaConsulta,
  aplicarLeitura,
  iniciarConsulta,
} from '../../utils/notificacoes-sequencia.js'

// A lista e o contador pertencem à conta que os carregou, e a contagem sai sempre da lista.
const INICIAL = {
  usuarioId: null,
  geracao: 0,
  status: 'carregando',
  notificacoes: [],
  totalNaoLidas: 0,
  mensagem: '',
  processandoId: null,
}

function formatarDataHora(valor) {
  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return 'Data indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(data)
}

function ListaCarregando() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-8 space-y-4"
    >
      <span className="sr-only">Carregando notificações...</span>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="surface-card h-32 animate-pulse rounded-[14px]"
        />
      ))}
    </div>
  )
}

export default function AlunoNotificacoesPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const usuarioId = usuario?.id
  const montado = useRef(true)
  // Lidos no momento da resposta: de quem é a sessão agora e qual geração está valendo.
  const contaAtual = useRef(usuarioId)
  contaAtual.current = usuarioId
  const [estado, setEstado] = useState(INICIAL)
  const estadoAtual = useRef(estado)
  estadoAtual.current = estado

  useEffect(() => {
    montado.current = true
    const controlador = new AbortController()

    // Esta consulta recebe um número: se uma leitura local ou outra consulta acontecer antes da
    // resposta, ela deixa de ser a vigente e o resultado é descartado.
    const consulta = iniciarConsulta(marcarConta(INICIAL, usuarioId))

    estadoAtual.current = consulta.estado
    setEstado(consulta.estado)

    async function carregar() {
      try {
        const resultado = await listarNotificacoes({
          signal: controlador.signal,
        })

        if (!montado.current) return
        if (!mesmaConta(usuarioId, contaAtual.current)) return

        const proximo = marcarConta(
          aplicarConsulta(estadoAtual.current, resultado, consulta.geracao),
          usuarioId,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
        notificarContagemAtualizada(proximo.totalNaoLidas)
      } catch (erro) {
        if (!montado.current || erro?.code === 'ERR_CANCELED') return
        if (!mesmaConta(usuarioId, contaAtual.current)) return

        const proximo = marcarConta(
          aplicarFalhaDaConsulta(
            estadoAtual.current,
            erro?.response?.data?.error?.message ??
              'Não foi possível carregar suas notificações.',
            consulta.geracao,
          ),
          usuarioId,
        )

        estadoAtual.current = proximo
        setEstado(proximo)
      }
    }

    carregar()

    return () => {
      montado.current = false
      controlador.abort()
    }
  }, [usuarioId])

  async function abrirNotificacao(notificacao) {
    // Sem feedback vinculado não há destino: o aviso só é marcado como lido.
    const { destino } = descreverAcaoNotificacao(notificacao)
    // Conta que pediu a ação: se outra pessoa entrar antes da resposta, nada do que voltar
    // pode mexer na tela dela.
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
      const atualizada = await marcarNotificacaoLida(
        notificacao.id,
      )

      if (!montado.current) return
      if (!mesmaConta(contaDaAcao, contaAtual.current)) return

      // Uma contagem só, tirada da lista, para a página e para o sino. A leitura avança a
      // geração: a consulta ainda em voo não a desfaz.
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
        mensagem:
          erro?.response?.data?.error?.message ??
          'Não foi possível marcar o aviso como lido. Tente novamente.',
      }, contaDaAcao))
    }
  }

  // O que não é da conta atual não aparece: na troca de pessoa a lista, o contador e o
  // aviso de erro somem na hora, antes de a nova consulta terminar.
  const visivel = estadoDaContaAtual(estado, usuarioId, INICIAL)

  return (
    <DashboardLayout>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-6 py-12 sm:px-10 lg:px-16"
      >
        <div className="mx-auto max-w-4xl">
          <Link
            to="/aluno"
            className="text-sm font-semibold text-lexis-300 hover:text-white"
          >
            ← Voltar ao painel
          </Link>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                Central do aluno
              </p>
              <h1 className="mt-2 text-4xl font-black text-white">
                Notificações
              </h1>
            </div>
            <p aria-live="polite" className="text-sm text-lexis-200">
              {visivel.totalNaoLidas === 1
                ? '1 aviso não lido'
                : `${visivel.totalNaoLidas} avisos não lidos`}
            </p>
          </div>

          {visivel.mensagem && (
            <div
              role="alert"
              className="mt-6 rounded-[14px] border border-red-300/30 bg-red-950/30 p-4 text-red-100"
            >
              {visivel.mensagem}
            </div>
          )}

          {visivel.status === 'carregando' && <ListaCarregando />}

          {visivel.status === 'erro' && (
            <div className="surface-card mt-8 rounded-[14px] p-8 text-center">
              <h2 className="text-xl font-bold text-white">
                Avisos indisponíveis
              </h2>
              <p className="mt-3 text-lexis-200">
                Recarregue a página para tentar novamente.
              </p>
            </div>
          )}

          {visivel.status === 'pronto' &&
            visivel.notificacoes.length === 0 && (
              <div className="surface-card mt-8 rounded-[14px] p-10 text-center">
                <h2 className="text-xl font-bold text-white">
                  Nenhuma notificação
                </h2>
                <p className="mt-3 text-lexis-200">
                  Avisos sobre suas correções e sua turma aparecem aqui.
                </p>
              </div>
            )}

          {visivel.status === 'pronto' &&
            visivel.notificacoes.length > 0 && (
              <ul className="mt-8 space-y-4">
                {visivel.notificacoes.map((notificacao) => {
                  const processando =
                    visivel.processandoId === notificacao.id
                  const acao = descreverAcaoNotificacao(notificacao)

                  return (
                    <li key={notificacao.id}>
                      <button
                        type="button"
                        disabled={
                          Boolean(visivel.processandoId) || !acao.acionavel
                        }
                        onClick={() => abrirNotificacao(notificacao)}
                        className="surface-card group w-full rounded-[14px] p-6 text-left transition hover:-translate-y-0.5 hover:border-lexis-300/50 disabled:cursor-wait disabled:opacity-70"
                      >
                        <span className="flex items-start gap-4">
                          <span
                            aria-hidden="true"
                            className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                              notificacao.lidaEm
                                ? 'bg-lexis-500/40'
                                : 'bg-lexis-300'
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-lg text-white">
                                {notificacao.titulo}
                              </strong>
                              <span className="text-xs text-lexis-300">
                                {formatarDataHora(notificacao.criadaEm)}
                              </span>
                            </span>
                            <span className="mt-2 block leading-7 text-lexis-100">
                              {notificacao.mensagem}
                            </span>
                            <span className="mt-4 inline-flex text-sm font-bold text-lexis-300 group-hover:text-white">
                              {processando
                                ? acao.rotuloProcessando
                                : acao.rotulo}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
        </div>
      </motion.section>
    </DashboardLayout>
  )
}
