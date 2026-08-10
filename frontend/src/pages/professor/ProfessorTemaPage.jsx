import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useParams,
} from 'react-router'

import ContentCard from '../../components/ui/ContentCard.jsx'
import ContentRail from '../../components/ui/ContentRail.jsx'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import {
  listarRedacoesDaTurma,
} from '../../services/redacoes.js'
import {
  obterTemaProfessor,
} from '../../services/temas.js'

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

function formatarOrigem(origemTexto) {
  return origemTexto === 'OCR'
    ? 'Imagem digitalizada'
    : 'Texto digitado'
}

function formatarSituacaoPrazo(redacao) {
  if (redacao.enviadaComAtraso === true) {
    return 'Enviada com atraso'
  }

  if (redacao.enviadaComAtraso === false) {
    return 'Enviada no prazo'
  }

  return 'Prazo não informado'
}

function RedacaoSkeleton() {
  return (
    <div className="min-h-[18rem] w-[18rem] animate-pulse rounded-2xl border border-lexis-200/10 bg-lexis-900/70 sm:w-[22rem]">
      <div className="h-full min-h-[18rem] rounded-2xl bg-gradient-to-br from-lexis-800/60 to-lexis-950" />
    </div>
  )
}

export default function ProfessorTemaPage() {
  const { temaId } = useParams()

  const [pagina, setPagina] = useState({
    status: 'carregando',
    tema: null,
    redacoes: [],
    mensagem: '',
  })

  useEffect(() => {
    let componentActive = true

    async function carregarTema() {
      setPagina({
        status: 'carregando',
        tema: null,
        redacoes: [],
        mensagem: '',
      })

      try {
        const tema =
          await obterTemaProfessor(temaId)

        const turmaId =
          tema.turma?.id ?? tema.turmaId

        const redacoes =
          await listarRedacoesDaTurma(
            turmaId,
            {
              temaId,
            },
          )

        if (!componentActive) {
          return
        }

        setPagina({
          status: 'pronto',
          tema,
          redacoes: Array.isArray(redacoes)
            ? redacoes
            : [],
          mensagem: '',
        })
      } catch (error) {
        if (!componentActive) {
          return
        }

        setPagina({
          status: 'erro',
          tema: null,
          redacoes: [],
          mensagem:
            error?.response?.data?.error
              ?.message ??
            'Não foi possível carregar este tema.',
        })
      }
    }

    carregarTema()

    return () => {
      componentActive = false
    }
  }, [temaId])

  const turmaId =
    pagina.tema?.turma?.id ??
    pagina.tema?.turmaId

  return (
    <DashboardLayout>
      <motion.section
        initial={{
          opacity: 0,
          y: 24,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative isolate overflow-hidden border-b border-lexis-200/10 px-6 py-14 sm:px-10 lg:px-16"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_15%,rgba(83,195,255,0.2),transparent_34%),linear-gradient(135deg,rgba(9,62,102,0.4),rgba(3,19,33,0.95))]"
        />

        <div className="mx-auto max-w-7xl">
          <Link
            to={
              turmaId
                ? `/professor/turmas/${turmaId}`
                : '/professor'
            }
            className="inline-flex items-center gap-2 rounded-full border border-lexis-300/20 bg-lexis-950/40 px-4 py-2 text-sm font-semibold text-lexis-200 transition hover:border-lexis-300/50 hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Voltar para a turma
          </Link>

          {pagina.status ===
            'carregando' && (
            <div className="mt-12 animate-pulse">
              <div className="h-4 w-40 rounded bg-lexis-300/20" />
              <div className="mt-5 h-24 max-w-4xl rounded bg-lexis-200/15" />
              <div className="mt-5 h-5 max-w-xl rounded bg-lexis-200/10" />
            </div>
          )}

          {pagina.status === 'erro' && (
            <div className="mt-12 max-w-2xl rounded-2xl border border-red-300/20 bg-red-950/20 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-200">
                Não foi possível abrir o tema
              </p>

              <p className="mt-3 leading-7 text-red-100">
                {pagina.mensagem}
              </p>
            </div>
          )}

          {pagina.status === 'pronto' && (
            <div className="mt-12">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-lexis-300">
                Tema de redação
              </p>

              <h1 className="mt-4 max-w-5xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                {pagina.tema.enunciado}
              </h1>

              {pagina.tema.descricao && (
                <p className="mt-6 max-w-3xl text-base leading-8 text-lexis-100 sm:text-lg">
                  {pagina.tema.descricao}
                </p>
              )}

              <dl className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-xl border border-lexis-200/10 bg-lexis-950/45 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-lexis-300">
                    Turma
                  </dt>

                  <dd className="mt-1 font-bold text-white">
                    {pagina.tema.turma?.nome}
                  </dd>
                </div>

                <div className="rounded-xl border border-lexis-200/10 bg-lexis-950/45 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-lexis-300">
                    Prazo de entrega
                  </dt>

                  <dd className="mt-1 font-bold text-white">
                    {formatarDataHora(
                      pagina.tema
                        .prazoEntrega,
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-lexis-200/10 bg-lexis-950/45 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-lexis-300">
                    Redações recebidas
                  </dt>

                  <dd className="mt-1 font-bold text-white">
                    {pagina.redacoes.length}
                  </dd>
                </div>

                <div className="rounded-xl border border-lexis-200/10 bg-lexis-950/45 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-lexis-300">
                    Situação
                  </dt>

                  <dd className="mt-1 font-bold text-white">
                    {pagina.tema.ativo
                      ? 'Ativo'
                      : 'Arquivado'}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </motion.section>

      {pagina.status === 'pronto' &&
        pagina.tema.instrucoes && (
          <section className="border-b border-lexis-200/10 px-6 py-10 sm:px-10 lg:px-16">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
                Orientações
              </p>

              <p className="mt-4 max-w-4xl whitespace-pre-line leading-8 text-lexis-100">
                {pagina.tema.instrucoes}
              </p>
            </div>
          </section>
        )}

      {pagina.status === 'pronto' && (
        <section className="border-b border-lexis-200/10 px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
              Avaliação
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Critérios de correção
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagina.tema.criterios
                ?.length > 0 ? (
                pagina.tema.criterios.map(
                  (criterio, index) => (
                    <motion.article
                      key={criterio.id}
                      initial={{
                        opacity: 0,
                        y: 16,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index * 0.06,
                      }}
                      className="rounded-2xl border border-lexis-200/10 bg-lexis-900/70 p-6"
                    >
                      <span className="text-sm font-bold text-lexis-300">
                        {String(
                          criterio.ordem,
                        ).padStart(2, '0')}
                      </span>

                      <h3 className="mt-3 text-xl font-bold text-white">
                        {criterio.nome}
                      </h3>

                      <p className="mt-3 leading-7 text-lexis-100">
                        {criterio.descricao}
                      </p>
                    </motion.article>
                  ),
                )
              ) : (
                <p className="text-lexis-200">
                  Nenhum critério foi
                  cadastrado para este tema.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {pagina.status ===
        'carregando' && (
        <ContentRail
          eyebrow="Entregas"
          title="Redações recebidas"
          description="Carregando as redações deste tema."
        >
          {[0, 1, 2].map((item) => (
            <RedacaoSkeleton key={item} />
          ))}
        </ContentRail>
      )}

      {pagina.status === 'pronto' && (
        <ContentRail
          id="redacoes"
          eyebrow="Entregas"
          title="Redações recebidas"
          description="Selecione uma redação para consultar o texto, a análise e o feedback."
          emptyMessage="Nenhum aluno enviou uma redação para este tema."
        >
          {pagina.redacoes.map(
            (redacao, index) => (
              <ContentCard
                key={redacao.id}
                eyebrow={formatarOrigem(
                  redacao.origemTexto,
                )}
                title={
                  redacao.aluno?.nome ??
                  'Aluno'
                }
                description={
                  redacao.aluno?.email ??
                  'E-mail indisponível'
                }
                status={formatarStatusRedacao(
                  redacao.status,
                )}
                details={[
                  formatarSituacaoPrazo(
                    redacao,
                  ),
                  `Enviada em ${formatarDataHora(redacao.enviadaEm)}`,
                ]}
                accentIndex={index}
                to={`/professor/redacoes/${redacao.id}`}
                actionLabel="Corrigir redação"
              />
            ),
          )}
        </ContentRail>
      )}
    </DashboardLayout>
  )
}
