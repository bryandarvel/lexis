import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import {
  listarNotificacoesProfessor,
  marcarNotificacaoProfessorLida,
} from '../../services/notificacoes-professor.js'
import { notificarContagemAtualizada } from '../../services/notification-events.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import { atualizarNotificacaoComoLida } from '../../utils/notifications.js'
import { descreverAvisoProfessor } from '../../utils/notificacoes-professor.js'
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
  status: 'carregando',
  notificacoes: [],
  totalNaoLidas: 0,
  processandoId: null,
  mensagem: '',
}

export default function ProfessorNotificacoesPage() {
  const navigate = useNavigate()
  const montado = useRef(true)
  const [estado, setEstado] = useState(INICIAL)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    montado.current = true

    const controlador = new AbortController()

    setEstado((atual) => ({ ...atual, status: 'carregando', mensagem: '' }))

    listarNotificacoesProfessor({ signal: controlador.signal })
      .then((resultado) => {
        if (!montado.current) return

        setEstado({
          ...INICIAL,
          status: 'pronto',
          notificacoes: resultado.notificacoes ?? [],
          totalNaoLidas: resultado.totalNaoLidas ?? 0,
        })
      })
      .catch((erro) => {
        if (!montado.current || controlador.signal.aborted) return

        setEstado({
          ...INICIAL,
          status: 'erro',
          mensagem: interpretarErroApi(
            erro,
            'Não foi possível carregar seus avisos.',
          ),
        })
      })

    return () => {
      montado.current = false
      controlador.abort()
    }
  }, [tentativa])

  const abrirAviso = useCallback(
    async (notificacao) => {
      const { destino } = descreverAvisoProfessor(notificacao)

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

        let total = 0

        setEstado((atual) => {
          const proximo = atualizarNotificacaoComoLida(atual, atualizada)

          total = proximo.totalNaoLidas

          return { ...proximo, processandoId: null }
        })
        notificarContagemAtualizada(total)

        if (destino) navigate(destino)
      } catch (erro) {
        if (!montado.current) return

        setEstado((atual) => ({
          ...atual,
          processandoId: null,
          mensagem: interpretarErroApi(
            erro,
            'Não foi possível marcar o aviso como lido. Tente novamente.',
          ),
        }))
      }
    },
    [navigate],
  )

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

        {estado.mensagem && (
          <p className="avisos-erro" role="alert">
            {estado.mensagem}
          </p>
        )}

        {estado.status === 'carregando' && (
          <p role="status" className="panel-subtitle avisos-carregando">
            Carregando seus avisos…
          </p>
        )}

        {estado.status === 'erro' && (
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

        {estado.status === 'pronto' && estado.notificacoes.length === 0 && (
          <section className="avisos-vazio" aria-labelledby="avisos-vazio-titulo">
            <h2 id="avisos-vazio-titulo">Nenhum aviso por enquanto</h2>
            <p>
              Quando um aluno enviar uma redação, o aviso aparece aqui.
            </p>
          </section>
        )}

        {estado.status === 'pronto' && estado.notificacoes.length > 0 && (
          <>
            <p role="status" className="avisos-contagem">
              {estado.totalNaoLidas === 0
                ? 'Nenhum aviso não lido.'
                : estado.totalNaoLidas === 1
                  ? '1 aviso não lido.'
                  : `${estado.totalNaoLidas} avisos não lidos.`}
            </p>

            <ul className="avisos-lista">
              {estado.notificacoes.map((notificacao) => {
                const aviso = descreverAvisoProfessor(notificacao)
                const processando = estado.processandoId === notificacao.id
                const lido = Boolean(notificacao.lidaEm)

                return (
                  <li key={notificacao.id}>
                    <button
                      type="button"
                      className={`avisos-item${lido ? '' : ' nao-lido'}`}
                      disabled={
                        Boolean(estado.processandoId) || !aviso.acionavel
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
