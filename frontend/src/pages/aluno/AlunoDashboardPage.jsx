import {
  useEffect,
  useState,
} from 'react'

import ContentCard from '../../components/ui/ContentCard.jsx'
import ContentRail from '../../components/ui/ContentRail.jsx'
import HeroBanner from '../../components/ui/HeroBanner.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import {
  listarMinhasRedacoes,
} from '../../services/redacoes.js'
import {
  listarTemasDoAluno,
} from '../../services/temas.js'
import {
  entrarEmTurma,
} from '../../services/turmas.js'
import { normalizarCodigoAcesso } from '../../utils/class-code.js'

async function carregarDadosDashboard() {
  const [themes, essays] = await Promise.all([
    listarTemasDoAluno(),
    listarMinhasRedacoes(),
  ])

  return {
    status: 'pronto',
    themes: Array.isArray(themes) ? themes : [],
    essays: Array.isArray(essays) ? essays : [],
  }
}

function formatarData(value) {
  if (!value) {
    return 'Data indisponível'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(date)
}

function formatarStatusRedacao(status) {
  const statuses = {
    RASCUNHO: 'Rascunho',
    ENVIADA: 'Aguardando correção',
    AVALIADA: 'Corrigida',
  }

  return statuses[status] ?? 'Não iniciada'
}

function obterStatusTema(theme, essay) {
  if (essay) {
    return formatarStatusRedacao(essay.status)
  }

  const deadline = new Date(theme.prazoEntrega)

  if (
    !Number.isNaN(deadline.getTime()) &&
    deadline.getTime() < Date.now()
  ) {
    return 'Prazo encerrado'
  }

  return 'Disponível'
}

function obterDetalhesTema(theme, essay) {
  const details = [
    `Prazo: ${formatarData(theme.prazoEntrega)}`,
    `${theme.criterios?.length ?? 0} critérios`,
  ]

  if (essay?.enviadaEm) {
    details.push(
      `Enviada em ${formatarData(essay.enviadaEm)}`,
    )
  }

  return details
}

function PainelSkeleton() {
  return (
    <div className="min-h-[18rem] w-[18rem] animate-pulse rounded-2xl border border-lexis-200/10 bg-lexis-900/70 sm:w-[22rem]">
      <div className="h-full min-h-[18rem] rounded-2xl bg-gradient-to-br from-lexis-800/60 to-lexis-950" />
    </div>
  )
}

export default function AlunoDashboardPage() {
  const { usuario } = useAuth()

  const [dashboard, setDashboard] = useState({
    status: 'carregando',
    themes: [],
    essays: [],
  })
  const [codigoAcesso, setCodigoAcesso] =
    useState('')
  const [matriculaStatus, setMatriculaStatus] =
    useState({
      enviando: false,
      tipo: null,
      mensagem: '',
    })

  const firstName =
    usuario?.nome?.split(' ')[0] ?? 'Aluno'

  useEffect(() => {
    let componentActive = true

    async function carregarDashboard() {
      try {
        const dados = await carregarDadosDashboard()

        if (!componentActive) {
          return
        }

        setDashboard(dados)
      } catch {
        if (!componentActive) {
          return
        }

        setDashboard({
          status: 'erro',
          themes: [],
          essays: [],
        })
      }
    }

    carregarDashboard()

    return () => {
      componentActive = false
    }
  }, [])

  async function handleEntrarTurma(event) {
    event.preventDefault()

    if (
      matriculaStatus.enviando ||
      codigoAcesso.length !== 8
    ) {
      return
    }

    setMatriculaStatus({
      enviando: true,
      tipo: null,
      mensagem: '',
    })

    try {
      await entrarEmTurma(codigoAcesso)
      const dados = await carregarDadosDashboard()

      setDashboard(dados)
      setCodigoAcesso('')
      setMatriculaStatus({
        enviando: false,
        tipo: 'sucesso',
        mensagem:
          'Matrícula realizada. Os temas da turma já estão disponíveis.',
      })
    } catch (error) {
      setMatriculaStatus({
        enviando: false,
        tipo: 'erro',
        mensagem:
          error?.response?.data?.error?.message ??
          'Não foi possível entrar na turma.',
      })
    }
  }

  const essaysByTheme = new Map(
    dashboard.essays.map((essay) => [
      essay.temaId,
      essay,
    ]),
  )

  const correctedEssays =
    dashboard.essays.filter(
      (essay) => essay.status === 'AVALIADA',
    )

  const themesEmptyMessage =
    dashboard.status === 'erro'
      ? 'Não foi possível carregar os temas. Verifique a conexão com a API e sua matrícula.'
      : 'Sua turma ainda não possui temas disponíveis.'

  const essaysEmptyMessage =
    dashboard.status === 'erro'
      ? 'Não foi possível carregar suas redações.'
      : 'Quando você iniciar uma redação, ela aparecerá aqui.'

  return (
    <DashboardLayout>
      <HeroBanner
        eyebrow={`Olá, ${firstName}`}
        title="Sua jornada de escrita começa por aqui."
        description="Consulte os temas da sua turma, acompanhe cada entrega e acesse as correções publicadas pelo professor."
        metadata={[
          `${dashboard.themes.length} temas disponíveis`,
          `${dashboard.essays.length} redações iniciadas`,
          `${correctedEssays.length} correções disponíveis`,
        ]}
        primaryAction={{
          label: 'Ver temas',
          href: '#temas',
        }}
        secondaryAction={{
          label: 'Minhas redações',
          href: '#redacoes',
        }}
      />

      <section className="border-b border-lexis-200/15 px-6 py-8">
        <form
          onSubmit={handleEntrarTurma}
          className="surface-card mx-auto flex max-w-7xl flex-col gap-4 rounded-[14px] p-5 md:flex-row md:items-end"
          aria-busy={matriculaStatus.enviando}
        >
          <label className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-lexis-50">
              Entrar em uma turma
            </span>
            <span className="mt-1 block text-xs leading-5 text-lexis-200">
              Cole o código de oito caracteres enviado pelo professor.
            </span>
            <input
              name="codigoAcesso"
              value={codigoAcesso}
              onChange={(event) => {
                setCodigoAcesso(
                  normalizarCodigoAcesso(
                    event.target.value,
                  ),
                )
                setMatriculaStatus((estadoAtual) => ({
                  ...estadoAtual,
                  tipo: null,
                  mensagem: '',
                }))
              }}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="LEX3A2K9"
              aria-describedby="ajuda-codigo-turma"
              aria-invalid={
                codigoAcesso.length > 0 &&
                codigoAcesso.length !== 8
              }
              className="mt-3 w-full rounded-[10px] border border-lexis-300/30 bg-lexis-950 px-4 py-3 font-mono text-lg font-bold uppercase tracking-[0.16em] text-lexis-50 outline-none focus:border-lexis-300"
              required
            />
          </label>

          <button
            type="submit"
            disabled={
              matriculaStatus.enviando ||
              codigoAcesso.length !== 8
            }
            className="min-h-12 rounded-[10px] bg-lexis-400 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            {matriculaStatus.enviando
              ? 'Entrando...'
              : 'Entrar na turma'}
          </button>

          <p
            id="ajuda-codigo-turma"
            role={
              matriculaStatus.tipo === 'erro'
                ? 'alert'
                : 'status'
            }
            className={`text-sm md:max-w-xs ${
              matriculaStatus.tipo === 'erro'
                ? 'text-red-600'
                : matriculaStatus.tipo === 'sucesso'
                  ? 'text-emerald-600'
                  : 'sr-only'
            }`}
          >
            {matriculaStatus.mensagem ||
              'O código é normalizado automaticamente.'}
          </p>
        </form>
      </section>

      <ContentRail
        id="temas"
        eyebrow="Propostas"
        title="Temas da sua turma"
        description="Acompanhe os prazos e o andamento de cada proposta de redação."
        emptyMessage={themesEmptyMessage}
      >
        {dashboard.status === 'carregando'
          ? [0, 1, 2].map((item) => (
              <PainelSkeleton key={item} />
            ))
          : dashboard.themes.map(
              (theme, index) => {
                const essay =
                  essaysByTheme.get(theme.id)

                return (
                  <ContentCard
                    key={theme.id}
                    eyebrow={
                      theme.turma?.nome ??
                      'Tema de redação'
                    }
                    title={theme.enunciado}
                    description={
                      theme.descricao ??
                      'Consulte as orientações e produza sua redação.'
                    }
                    status={obterStatusTema(
                      theme,
                      essay,
                    )}
                    details={obterDetalhesTema(
                      theme,
                      essay,
                    )}
                    accentIndex={index}
                    to={
                      essay?.status === 'AVALIADA'
                        ? `/aluno/redacoes/${essay.id}/feedback`
                        : undefined
                    }
                    actionLabel="Abrir correção"
                  />
                )
              },
            )}
      </ContentRail>

      <div className="border-t border-lexis-200/10">
        <ContentRail
          id="redacoes"
          eyebrow="Acompanhamento"
          title="Minhas redações"
          description="Consulte seus rascunhos, entregas e correções publicadas."
          emptyMessage={essaysEmptyMessage}
        >
          {dashboard.status === 'carregando'
            ? [0, 1].map((item) => (
                <PainelSkeleton key={item} />
              ))
            : dashboard.essays.map(
                (essay, index) => (
                  <ContentCard
                    key={essay.id}
                    eyebrow="Redação"
                    title={
                      essay.tema?.enunciado ??
                      'Tema indisponível'
                    }
                    description={
                      essay.status === 'AVALIADA'
                        ? 'Sua correção já está disponível.'
                        : essay.status === 'ENVIADA'
                          ? 'Entrega realizada. Aguarde a correção do professor.'
                          : 'Continue escrevendo antes de realizar a entrega.'
                    }
                    status={formatarStatusRedacao(
                      essay.status,
                    )}
                    details={[
                      essay.tema?.turma?.nome ??
                        'Turma indisponível',
                      essay.origemTexto === 'OCR'
                        ? 'Texto digitalizado'
                        : 'Texto digitado',
                      essay.enviadaEm
                        ? `Enviada em ${formatarData(essay.enviadaEm)}`
                        : `Atualizada em ${formatarData(essay.atualizadoEm)}`,
                    ]}
                    accentIndex={index + 1}
                    to={
                      essay.status === 'AVALIADA'
                        ? `/aluno/redacoes/${essay.id}/feedback`
                        : undefined
                    }
                    actionLabel="Abrir correção"
                  />
                ),
              )}
        </ContentRail>
      </div>
    </DashboardLayout>
  )
}
