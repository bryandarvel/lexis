import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useParams,
} from 'react-router'

import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { COMPETENCIAS_ENEM } from '../../constants/competencias-enem.js'
import {
  obterFeedbackAluno,
} from '../../services/feedbacks.js'
import {
  obterMinhaRedacao,
} from '../../services/redacoes.js'

function formatarDataHora(value) {
  if (!value) {
    return 'Data indisponível'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function PaginaCarregando() {
  return (
    <DashboardLayout>
      <section className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-5 w-40 rounded bg-lexis-300/20" />
          <div className="mt-6 h-14 max-w-3xl rounded bg-lexis-200/15" />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="h-[28rem] rounded-2xl bg-lexis-900/70" />
            <div className="h-[28rem] rounded-2xl bg-lexis-900/70" />
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}

export default function AlunoFeedbackPage() {
  const { redacaoId } = useParams()

  const [page, setPage] = useState({
    status: 'carregando',
    essay: null,
    feedback: null,
    message: '',
  })

  useEffect(() => {
    let componentActive = true

    async function carregarFeedback() {
      try {
        const [essay, feedback] =
          await Promise.all([
            obterMinhaRedacao(redacaoId),
            obterFeedbackAluno(redacaoId),
          ])

        if (!componentActive) {
          return
        }

        setPage({
          status: 'pronto',
          essay,
          feedback,
          message: '',
        })
      } catch (error) {
        if (!componentActive) {
          return
        }

        setPage({
          status: 'erro',
          essay: null,
          feedback: null,
          message:
            error?.response?.data?.error
              ?.message ??
            'Não foi possível carregar esta correção.',
        })
      }
    }

    carregarFeedback()

    return () => {
      componentActive = false
    }
  }, [redacaoId])

  if (page.status === 'carregando') {
    return <PaginaCarregando />
  }

  if (page.status === 'erro') {
    return (
      <DashboardLayout>
        <section className="px-6 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <Link
              to="/aluno"
              className="text-sm font-semibold text-lexis-300 hover:text-white"
            >
              ← Voltar ao painel
            </Link>

            <div className="mt-8 max-w-2xl rounded-2xl border border-red-300/20 bg-red-950/20 p-6">
              <h1 className="text-xl font-bold text-red-100">
                Correção indisponível
              </h1>

              <p className="mt-3 leading-7 text-red-100">
                {page.message}
              </p>
            </div>
          </div>
        </section>
      </DashboardLayout>
    )
  }

  const { essay, feedback } = page
  const competenciasDisponiveis =
    COMPETENCIAS_ENEM.filter(
      ({ campo }) =>
        Number.isInteger(feedback[campo]),
    )

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <section className="relative isolate overflow-hidden border-b border-lexis-200/10 px-6 py-12 sm:px-10 lg:px-16">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-lexis-900"
          />

          <div className="mx-auto max-w-7xl">
            <Link
              to="/aluno"
              className="inline-flex items-center gap-2 rounded-full border border-lexis-300/20 bg-lexis-950/40 px-4 py-2 text-sm font-semibold text-lexis-200 transition hover:border-lexis-300/50 hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Voltar ao painel
            </Link>

            <p className="mt-10 text-sm font-bold uppercase tracking-[0.2em] text-lexis-300">
              Correção publicada
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              {essay.tema.enunciado}
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-lexis-100">
              Confira a avaliação do professor e os
              comentários específicos de cada critério.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full border border-lexis-200/10 bg-lexis-950/45 px-4 py-2 text-sm font-semibold text-lexis-100">
                {essay.tema.turma?.nome ?? 'Sua turma'}
              </span>

              <span className="rounded-full border border-lexis-200/10 bg-lexis-950/45 px-4 py-2 text-sm font-semibold text-lexis-100">
                Versão {feedback.numero}
              </span>

              <span className="rounded-full border border-lexis-200/10 bg-lexis-950/45 px-4 py-2 text-sm font-semibold text-lexis-100">
                Publicada em {formatarDataHora(feedback.publicadoEm)}
              </span>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]">
            <aside className="space-y-6">
              <section className="surface-card rounded-[14px] p-8 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                  Nota total
                </p>

                <p className="mt-5 text-7xl font-black text-white">
                  {feedback.nota}
                </p>

                <p className="mt-3 text-sm text-lexis-200">
                  de 1000 pontos
                </p>
              </section>

              {competenciasDisponiveis.length > 0 && (
                <section className="surface-card rounded-[14px] p-6">
                  <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-lexis-300">
                    Notas por competência
                  </h2>
                  <dl className="mt-4 space-y-4">
                    {competenciasDisponiveis.map(
                      ({ campo, numero, titulo }) => (
                        <div
                          key={campo}
                          className="border-b border-lexis-200/10 pb-4 last:border-0 last:pb-0"
                        >
                          <dt className="text-sm font-semibold text-white">
                            Competência {numero}
                          </dt>
                          <dd className="mt-1 flex items-start justify-between gap-4 text-xs leading-5 text-lexis-200">
                            <span>{titulo}</span>
                            <strong className="shrink-0 text-base text-white">
                              {feedback[campo]}/200
                            </strong>
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                </section>
              )}

              <section className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                  Entrega
                </p>

                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-sm text-lexis-300">
                      Enviada em
                    </dt>
                    <dd className="mt-1 font-semibold text-white">
                      {formatarDataHora(essay.enviadaEm)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm text-lexis-300">
                      Formato
                    </dt>
                    <dd className="mt-1 font-semibold text-white">
                      {essay.origemTexto === 'OCR'
                        ? 'Imagem digitalizada'
                        : 'Texto digitado'}
                    </dd>
                  </div>
                </dl>
              </section>
            </aside>

            <div className="space-y-6">
              <article className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                  Comentário geral
                </p>

                <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-lexis-50 sm:text-lg">
                  {feedback.comentarioGeral}
                </p>
              </article>

              {feedback.criterios?.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white">
                    Comentários por critério
                  </h2>

                  <div className="mt-5 grid gap-4">
                    {feedback.criterios.map(
                      (criterionFeedback) => (
                        <article
                          key={criterionFeedback.id}
                          className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6"
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-lexis-300">
                            Critério{' '}
                            {criterionFeedback.criterio.ordem}
                          </p>

                          <h3 className="mt-2 text-xl font-bold text-white">
                            {criterionFeedback.criterio.nome}
                          </h3>

                          <p className="mt-4 whitespace-pre-wrap leading-7 text-lexis-100">
                            {criterionFeedback.comentario}
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-lexis-200/10 px-6 py-12 sm:px-10 lg:px-16">
          <article className="mx-auto max-w-7xl rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
              Texto entregue
            </p>

            <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-lexis-50 sm:text-lg">
              {essay.texto}
            </div>
          </article>
        </section>
      </motion.div>
    </DashboardLayout>
  )
}
