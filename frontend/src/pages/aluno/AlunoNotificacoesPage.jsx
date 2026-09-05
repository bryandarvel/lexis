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
import {
  listarNotificacoes,
  marcarNotificacaoLida,
} from '../../services/notificacoes.js'
import {
  notificarContagemAtualizada,
} from '../../services/notification-events.js'
import {
  atualizarNotificacaoComoLida,
  obterLinkNotificacao,
} from '../../utils/notifications.js'

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
  const montado = useRef(true)
  const [estado, setEstado] = useState({
    status: 'carregando',
    notificacoes: [],
    totalNaoLidas: 0,
    mensagem: '',
    processandoId: null,
  })

  useEffect(() => {
    montado.current = true
    const controlador = new AbortController()

    async function carregar() {
      try {
        const resultado = await listarNotificacoes({
          signal: controlador.signal,
        })

        if (!montado.current) return

        setEstado({
          status: 'pronto',
          notificacoes: resultado.notificacoes,
          totalNaoLidas: resultado.totalNaoLidas,
          mensagem: '',
          processandoId: null,
        })
        notificarContagemAtualizada(resultado.totalNaoLidas)
      } catch (erro) {
        if (!montado.current || erro?.code === 'ERR_CANCELED') return

        setEstado((atual) => ({
          ...atual,
          status: 'erro',
          mensagem:
            erro?.response?.data?.error?.message ??
            'Não foi possível carregar suas notificações.',
        }))
      }
    }

    carregar()

    return () => {
      montado.current = false
      controlador.abort()
    }
  }, [])

  async function abrirNotificacao(notificacao) {
    const destino = obterLinkNotificacao(notificacao)

    if (notificacao.lidaEm) {
      navigate(destino)
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

      const proximoTotalNaoLidas = Math.max(
        0,
        estado.totalNaoLidas - 1,
      )

      setEstado((atual) => {
        const proximo = atualizarNotificacaoComoLida(
          atual,
          atualizada,
        )

        return {
          ...proximo,
          processandoId: null,
        }
      })
      notificarContagemAtualizada(proximoTotalNaoLidas)
      navigate(destino)
    } catch (erro) {
      if (!montado.current) return

      setEstado((atual) => ({
        ...atual,
        processandoId: null,
        mensagem:
          erro?.response?.data?.error?.message ??
          'Não foi possível marcar o aviso como lido. Tente novamente.',
      }))
    }
  }

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
              {estado.totalNaoLidas === 1
                ? '1 aviso não lido'
                : `${estado.totalNaoLidas} avisos não lidos`}
            </p>
          </div>

          {estado.mensagem && (
            <div
              role="alert"
              className="mt-6 rounded-[14px] border border-red-300/30 bg-red-950/30 p-4 text-red-100"
            >
              {estado.mensagem}
            </div>
          )}

          {estado.status === 'carregando' && <ListaCarregando />}

          {estado.status === 'erro' && (
            <div className="surface-card mt-8 rounded-[14px] p-8 text-center">
              <h2 className="text-xl font-bold text-white">
                Avisos indisponíveis
              </h2>
              <p className="mt-3 text-lexis-200">
                Recarregue a página para tentar novamente.
              </p>
            </div>
          )}

          {estado.status === 'pronto' &&
            estado.notificacoes.length === 0 && (
              <div className="surface-card mt-8 rounded-[14px] p-10 text-center">
                <h2 className="text-xl font-bold text-white">
                  Nenhuma notificação
                </h2>
                <p className="mt-3 text-lexis-200">
                  Quando uma correção for publicada, o aviso aparecerá aqui.
                </p>
              </div>
            )}

          {estado.status === 'pronto' &&
            estado.notificacoes.length > 0 && (
              <ul className="mt-8 space-y-4">
                {estado.notificacoes.map((notificacao) => {
                  const processando =
                    estado.processandoId === notificacao.id

                  return (
                    <li key={notificacao.id}>
                      <button
                        type="button"
                        disabled={Boolean(estado.processandoId)}
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
                                ? 'Abrindo correção...'
                                : 'Ver correção →'}
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
