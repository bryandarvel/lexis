import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useParams,
} from 'react-router'

import AnalysisPanel from '../../components/correction/AnalysisPanel.jsx'
import EssayEvidenceText from '../../components/correction/EssayEvidenceText.jsx'
import FeedbackEditor from '../../components/correction/FeedbackEditor.jsx'
import { COMPETENCIAS_ENEM } from '../../constants/competencias-enem.js'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRascunho } from '../../hooks/useRascunho.js'
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
import { criarChaveRascunho } from '../../utils/draft-storage.js'

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

  const pontuacoesCompetencias =
    Object.fromEntries(
      COMPETENCIAS_ENEM.map(({ campo }) => [
        campo,
        currentFeedback?.[campo] == null
          ? ''
          : String(currentFeedback[campo]),
      ]),
    )

  const possuiPontuacaoPorCompetencia =
    COMPETENCIAS_ENEM.some(
      ({ campo }) =>
        currentFeedback?.[campo] != null,
    )

  return {
    ...pontuacoesCompetencias,
    legacyScore:
      !possuiPontuacaoPorCompetencia &&
      currentFeedback?.nota != null
        ? String(currentFeedback.nota)
        : '',
    generalComment:
      currentFeedback?.comentarioGeral ?? '',
    criterionComments,
  }
}

function montarDadosFeedback(form) {
  const generalComment =
    form.generalComment.trim()

  return {
    ...Object.fromEntries(
      COMPETENCIAS_ENEM.map(({ campo }) => {
        const texto = String(
          form[campo] ?? '',
        ).trim()

        return [
          campo,
          texto === '' ? null : Number(texto),
        ]
      }),
    ),
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
  const { usuario } = useAuth()

  const [pagina, setPagina] = useState({
    status: 'carregando',
    redacao: null,
    analises: [],
    feedback: null,
    mensagem: '',
  })

  const [form, setForm] = useState({
    competencia1: '',
    competencia2: '',
    competencia3: '',
    competencia4: '',
    competencia5: '',
    legacyScore: '',
    generalComment: '',
    criterionComments: {},
  })
  const [formServidor, setFormServidor] =
    useState(null)

  const [analysisBusy, setAnalysisBusy] =
    useState(false)
  const [feedbackAction, setFeedbackAction] =
    useState(null)
  const [analysisNotice, setAnalysisNotice] =
    useState(null)
  const [feedbackNotice, setFeedbackNotice] =
    useState(null)
  const [painelAtivo, setPainelAtivo] =
    useState('criterios')
  const [sheetAberto, setSheetAberto] =
    useState(false)
  const sheetRef = useRef(null)
  const sheetTriggerRef = useRef(null)
  const chaveRascunho = criarChaveRascunho(
    usuario?.id,
    redacaoId,
  )
  const {
    recuperado: rascunhoRecuperado,
    salvoEm: rascunhoSalvoEm,
    descartar: descartarRascunho,
    recuperar: recuperarRascunho,
  } = useRascunho({
    chave: chaveRascunho,
    habilitado: pagina.status === 'pronto',
    valorAtual: form,
  })

  const rascunhoDivergente = Boolean(
    rascunhoRecuperado &&
      formServidor &&
      JSON.stringify(rascunhoRecuperado.valor) !==
        JSON.stringify(formServidor),
  )

  useEffect(() => {
    if (!sheetAberto) {
      return undefined
    }

    const overflowAnterior = document.body.style.overflow
    const sheet = sheetRef.current
    const sheetTrigger = sheetTriggerRef.current

    document.body.style.overflow = 'hidden'
    sheet?.querySelector('[data-sheet-close]')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSheetAberto(false)
        return
      }

      if (event.key !== 'Tab' || !sheet) {
        return
      }

      const focaveis = Array.from(
        sheet.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      )

      if (focaveis.length === 0) {
        return
      }

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]

      if (
        event.shiftKey &&
        document.activeElement === primeiro
      ) {
        event.preventDefault()
        ultimo.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === ultimo
      ) {
        event.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = overflowAnterior
      document.removeEventListener('keydown', handleKeyDown)
      sheetTrigger?.focus()
    }
  }, [sheetAberto])

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

        const formularioServidor =
          criarFormularioFeedback(
            redacao,
            feedback,
          )

        setForm(formularioServidor)
        setFormServidor(formularioServidor)
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

  function handleRecoverDraft() {
    const valorRecuperado = recuperarRascunho()

    if (valorRecuperado) {
      setForm((formAtual) => ({
        ...formAtual,
        ...valorRecuperado,
        ...Object.fromEntries(
          COMPETENCIAS_ENEM.map(({ campo }) => [
            campo,
            valorRecuperado[campo] ?? '',
          ]),
        ),
        legacyScore:
          valorRecuperado.legacyScore ??
          valorRecuperado.score ??
          '',
      }))
    }
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

  function validarCompetencias(dados) {
    return COMPETENCIAS_ENEM.every(
      ({ campo }) =>
        dados[campo] == null ||
        (Number.isInteger(dados[campo]) &&
          dados[campo] >= 0 &&
          dados[campo] <= 200),
    )
  }

  async function handleSaveFeedback(event) {
    event.preventDefault()

    const dados = montarDadosFeedback(form)

    if (!validarCompetencias(dados)) {
      setFeedbackNotice({
        type: 'error',
        message:
          'Cada competência precisa ter uma nota inteira entre 0 e 200.',
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

      const formularioServidor =
        criarFormularioFeedback(
          pagina.redacao,
          feedback,
        )

      setForm(formularioServidor)
      setFormServidor(formularioServidor)
      descartarRascunho(formularioServidor)

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

    if (!validarCompetencias(dados)) {
      setFeedbackNotice({
        type: 'error',
        message:
          'Cada competência precisa ter uma nota inteira entre 0 e 200.',
      })
      return
    }

    if (
      COMPETENCIAS_ENEM.some(
        ({ campo }) => dados[campo] == null,
      ) ||
      dados.comentarioGeral == null
    ) {
      setFeedbackNotice({
        type: 'error',
        message:
          'Preencha as cinco competências e o comentário geral antes de publicar.',
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

      const formularioServidor =
        criarFormularioFeedback(
          redacao,
          feedback,
        )

      setForm(formularioServidor)
      setFormServidor(formularioServidor)
      descartarRascunho(formularioServidor)

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
              to="/professor/turmas"
              className="text-sm font-semibold text-lexis-300 hover:text-white"
            >
              ← Voltar às turmas
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
        <section className="border-b border-lexis-200/15 bg-lexis-900 px-6 py-12 sm:px-10 lg:px-16">
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

        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="correction-workspace mx-auto max-w-[100rem]">
            <article className="correction-essay surface-card rounded-[14px] p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                Texto entregue
              </p>

              <div className="mt-6">
                <EssayEvidenceText
                  texto={redacao.texto}
                  analise={analiseAtual}
                />
              </div>

              <dl className="mt-8 grid gap-3 border-t border-lexis-200/20 pt-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-lexis-300">Enviada em</dt>
                  <dd className="mt-1 font-semibold text-lexis-50">
                    {formatarDataHora(redacao.enviadaEm)}
                  </dd>
                </div>
                <div>
                  <dt className="text-lexis-300">Prazo considerado</dt>
                  <dd className="mt-1 font-semibold text-lexis-50">
                    {formatarDataHora(redacao.prazoConsideradoEm)}
                  </dd>
                </div>
              </dl>
            </article>

            {sheetAberto && (
              <button
                type="button"
                className="correction-sheet-backdrop"
                aria-label="Fechar painel de correção"
                onClick={() => setSheetAberto(false)}
              />
            )}

            <button
              ref={sheetTriggerRef}
              type="button"
              className="correction-sheet-trigger"
              onClick={() => setSheetAberto(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetAberto}
            >
              Comentários e critérios
            </button>

            <aside
              ref={sheetRef}
              className={`correction-tools ${sheetAberto ? 'is-open' : ''}`}
              role={sheetAberto ? 'dialog' : undefined}
              aria-modal={sheetAberto || undefined}
              aria-label="Comentários e critérios da correção"
            >
              <div className="correction-sheet-heading">
                <span aria-hidden="true" className="correction-sheet-handle" />
                <strong>Correção</strong>
                <button
                  type="button"
                  data-sheet-close
                  onClick={() => setSheetAberto(false)}
                >
                  Fechar
                </button>
              </div>

              <div className="correction-tabs" role="tablist" aria-label="Painéis da correção">
                <button
                  type="button"
                  role="tab"
                  aria-selected={painelAtivo === 'comentarios'}
                  aria-controls="painel-comentarios"
                  onClick={() => setPainelAtivo('comentarios')}
                >
                  Comentários
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={painelAtivo === 'criterios'}
                  aria-controls="painel-criterios"
                  onClick={() => setPainelAtivo('criterios')}
                >
                  Critérios
                </button>
              </div>

              <div
                id="painel-comentarios"
                className={`correction-tool-panel correction-comments ${painelAtivo === 'comentarios' ? 'is-active' : ''}`}
              >
                <AnalysisPanel
                  embedded
                  analysis={analiseAtual}
                  isRequesting={analysisBusy}
                  notice={analysisNotice}
                  onRequest={handleRequestAnalysis}
                />
              </div>

              <div
                id="painel-criterios"
                className={`correction-tool-panel correction-criteria ${painelAtivo === 'criterios' ? 'is-active' : ''}`}
              >
                {rascunhoDivergente && (
                  <div
                    role="status"
                    className="mx-4 mt-4 rounded-[10px] border border-amber-400/40 bg-amber-100/10 p-4 text-sm text-lexis-100"
                  >
                    <strong className="block text-lexis-50">
                      Rascunho local encontrado
                    </strong>
                    <p className="mt-2 leading-6">
                      Há alterações não enviadas salvas neste dispositivo.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRecoverDraft}
                        className="rounded-[8px] bg-lexis-400 px-3 py-2 font-bold text-white"
                      >
                        Recuperar rascunho
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          descartarRascunho(
                            formServidor ?? form,
                          )
                        }
                        className="rounded-[8px] border border-lexis-300/35 px-3 py-2 font-bold text-lexis-100"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                )}

                {!rascunhoDivergente && rascunhoSalvoEm && (
                  <p className="mx-4 mt-4 text-xs text-lexis-300" role="status">
                    Alterações locais protegidas em{' '}
                    {formatarDataHora(rascunhoSalvoEm)}.
                  </p>
                )}

                <FeedbackEditor
                  embedded
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
              </div>
            </aside>
          </div>
        </section>
      </motion.div>
    </DashboardLayout>
  )
}
