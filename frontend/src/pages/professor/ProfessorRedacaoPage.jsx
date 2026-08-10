import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useParams,
} from 'react-router'

import AnalysisPanel from '../../components/correction/AnalysisPanel.jsx'
import FeedbackEditor from '../../components/correction/FeedbackEditor.jsx'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import {
  listarAnalisesIa,
  solicitarAnaliseIa,
} from '../../services/analises-ia.js'
import {
  obterFeedbackProfessor,
  publicarFeedback,
  salvarRascunhoFeedback,
} from '../../services/feedbacks.js'
import {
  obterRedacaoProfessor,
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

function formatarStatusRedacao(status) {
  const statuses = {
    RASCUNHO: 'Rascunho',
    ENVIADA: 'Aguardando correção',
    AVALIADA: 'Corrigida',
  }

  return statuses[status] ?? status
}

function formatarStatusFeedback(status) {
  const statuses = {
    RASCUNHO: 'Rascunho',
    PUBLICADA: 'Publicada',
    SUBSTITUIDA: 'Substituída',
  }

  return statuses[status] ?? status
}

function obterMensagemErro(error, fallback) {
  return (
    error?.response?.data?.error?.message ??
    fallback
  )
}

function criarFormularioFeedback(
  redacao,
  feedback,
) {
  const currentFeedback =
    feedback?.versaoAtual ?? null

  const savedComments = new Map(
    (currentFeedback?.criterios ?? []).map(
      (item) => [
        item.criterioId,
        item.comentario,
      ],
    ),
  )

  const criterionComments = Object.fromEntries(
    (redacao.tema.criterios ?? []).map(
      (criterion) => [
        criterion.id,
        savedComments.get(criterion.id) ?? '',
      ],
    ),
  )

  return {
    score:
      currentFeedback?.nota == null
        ? ''
        : String(currentFeedback.nota),
    generalComment:
      currentFeedback?.comentarioGeral ?? '',
    criterionComments,
  }
}

function montarDadosFeedback(form) {
  const scoreText = String(form.score).trim()
  const generalComment =
    form.generalComment.trim()

  return {
    nota:
      scoreText === ''
        ? null
        : Number(scoreText),
    comentarioGeral:
      generalComment === ''
        ? null
        : generalComment,
    criterios: Object.entries(
      form.criterionComments,
    )
      .filter(
        ([, comment]) =>
          comment.trim().length > 0,
      )
      .map(([criterioId, comment]) => ({
        criterioId,
        comentario: comment.trim(),
      })),
  }
}

function PaginaCarregando() {
  return (
    <DashboardLayout>
      <section className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-5 w-40 rounded bg-lexis-300/20" />
          <div className="mt-6 h-14 max-w-3xl rounded bg-lexis-200/15" />

          <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
            <div className="h-[34rem] rounded-2xl bg-lexis-900/70" />
            <div className="h-[24rem] rounded-2xl bg-lexis-900/70" />
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}

export default function ProfessorRedacaoPage() {
  const { redacaoId } = useParams()

  const [pagina, setPagina] = useState({
    status: 'carregando',
    redacao: null,
    analises: [],
    feedback: null,
    mensagem: '',
  })

  const [form, setForm] = useState({
    score: '',
    generalComment: '',
    criterionComments: {},
  })

  const [analysisBusy, setAnalysisBusy] =
    useState(false)
  const [feedbackAction, setFeedbackAction] =
    useState(null)
  const [analysisNotice, setAnalysisNotice] =
    useState(null)
  const [feedbackNotice, setFeedbackNotice] =
    useState(null)

  useEffect(() => {
    let componentActive = true

    async function carregarRedacao() {
      try {
        const [
          redacao,
          analises,
          feedback,
        ] = await Promise.all([
          obterRedacaoProfessor(redacaoId),
          listarAnalisesIa(redacaoId),
          obterFeedbackProfessor(redacaoId),
        ])

        if (!componentActive) {
          return
        }

        setPagina({
          status: 'pronto',
          redacao,
          analises: Array.isArray(analises)
            ? analises
            : [],
          feedback,
          mensagem: '',
        })

        setForm(
          criarFormularioFeedback(
            redacao,
            feedback,
          ),
        )
      } catch (error) {
        if (!componentActive) {
          return
        }

        setPagina({
          status: 'erro',
          redacao: null,
          analises: [],
          feedback: null,
          mensagem:
            error?.response?.data?.error
              ?.message ??
            'Não foi possível carregar esta redação.',
        })
      }
    }

    carregarRedacao()

    return () => {
      componentActive = false
    }
  }, [redacaoId])

  function handleFieldChange(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function handleCriterionChange(
    criterionId,
    value,
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      criterionComments: {
        ...currentForm.criterionComments,
        [criterionId]: value,
      },
    }))
  }

  async function handleRequestAnalysis() {
    setAnalysisBusy(true)
    setAnalysisNotice(null)

    try {
      const analysis =
        await solicitarAnaliseIa(redacaoId)

      setPagina((currentPage) => ({
        ...currentPage,
        analises: [
          analysis,
          ...currentPage.analises.filter(
            (item) => item.id !== analysis.id,
          ),
        ],
      }))

      setAnalysisNotice({
        type: 'success',
        message:
          'A análise foi concluída e armazenada.',
      })
    } catch (error) {
      setAnalysisNotice({
        type: 'error',
        message: obterMensagemErro(
          error,
          'Não foi possível realizar a análise.',
        ),
      })
    } finally {
      setAnalysisBusy(false)
    }
  }

  function validarNota(dados) {
    return (
      dados.nota == null ||
      (Number.isInteger(dados.nota) &&
        dados.nota >= 0 &&
        dados.nota <= 1000)
    )
  }

  async function handleSaveFeedback(event) {
    event.preventDefault()

    const dados = montarDadosFeedback(form)

    if (!validarNota(dados)) {
      setFeedbackNotice({
        type: 'error',
        message:
          'A nota precisa ser um número inteiro entre 0 e 1000.',
      })
      return
    }

    setFeedbackAction('saving')
    setFeedbackNotice(null)

    try {
      await salvarRascunhoFeedback(
        redacaoId,
        dados,
      )

      const feedback =
        await obterFeedbackProfessor(redacaoId)

      setPagina((currentPage) => ({
        ...currentPage,
        feedback,
      }))

      setForm(
        criarFormularioFeedback(
          pagina.redacao,
          feedback,
        ),
      )

      setFeedbackNotice({
        type: 'success',
        message:
          'Rascunho salvo. O aluno ainda não pode visualizar esta correção.',
      })
    } catch (error) {
      setFeedbackNotice({
        type: 'error',
        message: obterMensagemErro(
          error,
          'Não foi possível salvar o rascunho.',
        ),
      })
    } finally {
      setFeedbackAction(null)
    }
  }

  async function handlePublishFeedback() {
    const dados = montarDadosFeedback(form)

    if (!validarNota(dados)) {
      setFeedbackNotice({
        type: 'error',
        message:
          'A nota precisa ser um número inteiro entre 0 e 1000.',
      })
      return
    }

    if (
      dados.nota == null ||
      dados.comentarioGeral == null
    ) {
      setFeedbackNotice({
        type: 'error',
        message:
          'Preencha a nota e o comentário geral antes de publicar.',
      })
      return
    }

    const confirmed = globalThis.confirm(
      'Publicar esta correção para o aluno?',
    )

    if (!confirmed) {
      return
    }

    setFeedbackAction('publishing')
    setFeedbackNotice(null)

    try {
      await salvarRascunhoFeedback(
        redacaoId,
        dados,
      )
      await publicarFeedback(redacaoId)

      const [feedback, redacao] =
        await Promise.all([
          obterFeedbackProfessor(redacaoId),
          obterRedacaoProfessor(redacaoId),
        ])

      setPagina((currentPage) => ({
        ...currentPage,
        redacao,
        feedback,
      }))

      setForm(
        criarFormularioFeedback(
          redacao,
          feedback,
        ),
      )

      setFeedbackNotice({
        type: 'success',
        message:
          'Correção publicada. O aluno foi notificado.',
      })
    } catch (error) {
      setFeedbackNotice({
        type: 'error',
        message: obterMensagemErro(
          error,
          'Não foi possível publicar a correção.',
        ),
      })
    } finally {
      setFeedbackAction(null)
    }
  }

  if (pagina.status === 'carregando') {
    return <PaginaCarregando />
  }

  if (pagina.status === 'erro') {
    return (
      <DashboardLayout>
        <section className="px-6 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <Link
              to="/professor"
              className="text-sm font-semibold text-lexis-300 hover:text-white"
            >
              ← Voltar ao painel
            </Link>

            <div className="mt-8 max-w-2xl rounded-2xl border border-red-300/20 bg-red-950/20 p-6">
              <h1 className="text-xl font-bold text-red-100">
                Não foi possível abrir a redação
              </h1>

              <p className="mt-3 leading-7 text-red-100">
                {pagina.mensagem}
              </p>
            </div>
          </div>
        </section>
      </DashboardLayout>
    )
  }

  const {
    redacao,
    analises,
    feedback,
  } = pagina

  const analiseAtual = analises[0] ?? null
  const feedbackAtual =
    feedback?.versaoAtual ?? null

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
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(57,176,255,0.2),transparent_36%),linear-gradient(135deg,rgba(8,56,91,0.42),rgba(3,19,33,0.96))]"
          />

          <div className="mx-auto max-w-7xl">
            <Link
              to={`/professor/temas/${redacao.tema.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-lexis-300/20 bg-lexis-950/40 px-4 py-2 text-sm font-semibold text-lexis-200 transition hover:border-lexis-300/50 hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Voltar para o tema
            </Link>

            <p className="mt-10 text-sm font-bold uppercase tracking-[0.2em] text-lexis-300">
              Correção de redação
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              {redacao.aluno.nome}
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-lexis-100">
              {redacao.tema.enunciado}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-full border border-lexis-200/10 bg-lexis-950/45 px-4 py-2 text-sm font-semibold text-lexis-100">
                {formatarStatusRedacao(
                  redacao.status,
                )}
              </span>

              <span className="rounded-full border border-lexis-200/10 bg-lexis-950/45 px-4 py-2 text-sm font-semibold text-lexis-100">
                {redacao.origemTexto === 'OCR'
                  ? 'Imagem digitalizada'
                  : 'Texto digitado'}
              </span>

              <span className="rounded-full border border-lexis-200/10 bg-lexis-950/45 px-4 py-2 text-sm font-semibold text-lexis-100">
                {redacao.enviadaComAtraso
                  ? 'Enviada com atraso'
                  : 'Enviada no prazo'}
              </span>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
            <article className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6 shadow-2xl shadow-black/20 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                Texto entregue
              </p>

              <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-lexis-50 sm:text-lg">
                {redacao.texto ??
                  'O texto desta redação não está disponível.'}
              </div>
            </article>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                  Aluno
                </p>

                <h2 className="mt-3 text-xl font-bold text-white">
                  {redacao.aluno.nome}
                </h2>

                <p className="mt-2 text-sm text-lexis-200">
                  {redacao.aluno.email}
                </p>
              </section>

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
                      {formatarDataHora(
                        redacao.enviadaEm,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm text-lexis-300">
                      Prazo considerado
                    </dt>
                    <dd className="mt-1 font-semibold text-white">
                      {formatarDataHora(
                        redacao.prazoConsideradoEm,
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                  Feedback humano
                </p>

                {feedbackAtual ? (
                  <>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-lexis-300">
                          Nota
                        </p>
                        <p className="mt-1 text-4xl font-black text-white">
                          {feedbackAtual.nota ?? '—'}
                        </p>
                      </div>

                      <span className="rounded-full bg-lexis-700/50 px-3 py-1 text-xs font-bold text-lexis-100">
                        {formatarStatusFeedback(
                          feedbackAtual.status,
                        )}
                      </span>
                    </div>

                    <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-lexis-100">
                      {feedbackAtual.comentarioGeral ??
                        'O comentário geral ainda não foi preenchido.'}
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-lexis-200">
                    A correção ainda não possui um rascunho de feedback.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </section>

        <AnalysisPanel
          analysis={analiseAtual}
          isRequesting={analysisBusy}
          notice={analysisNotice}
          onRequest={handleRequestAnalysis}
        />

        <FeedbackEditor
          action={feedbackAction}
          criteria={redacao.tema.criterios ?? []}
          currentFeedback={feedbackAtual}
          form={form}
          notice={feedbackNotice}
          onCriterionChange={handleCriterionChange}
          onFieldChange={handleFieldChange}
          onPublish={handlePublishFeedback}
          onSave={handleSaveFeedback}
        />
      </motion.div>
    </DashboardLayout>
  )
}
