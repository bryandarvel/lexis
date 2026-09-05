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
  listarTemasDaTurma,
} from '../../services/temas.js'
import {
  obterTurma,
} from '../../services/turmas.js'

function formatarPrazo(value) {
  if (!value) {
    return 'Prazo indisponível'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Prazo indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function obterStatusTema(tema) {
  if (!tema.ativo) {
    return 'Arquivado'
  }

  const prazo = new Date(
    tema.prazoEntrega,
  ).getTime()

  if (
    Number.isFinite(prazo) &&
    prazo < Date.now()
  ) {
    return 'Prazo encerrado'
  }

  return 'Recebendo redações'
}

function TemaSkeleton() {
  return (
    <div className="min-h-[18rem] w-[18rem] animate-pulse rounded-2xl border border-lexis-200/10 bg-lexis-900/70 sm:w-[22rem]">
      <div className="h-full min-h-[18rem] rounded-2xl bg-gradient-to-br from-lexis-800/60 to-lexis-950" />
    </div>
  )
}

export default function ProfessorTurmaPage() {
  const { turmaId } = useParams()

  const [pagina, setPagina] = useState({
    status: 'carregando',
    turma: null,
    temas: [],
    mensagem: '',
  })

  useEffect(() => {
    let componentActive = true

    async function carregarTurma() {
      setPagina({
        status: 'carregando',
        turma: null,
        temas: [],
        mensagem: '',
      })

      try {
        const [turma, temas] =
          await Promise.all([
            obterTurma(turmaId),
            listarTemasDaTurma(turmaId),
          ])

        if (!componentActive) {
          return
        }

        setPagina({
          status: 'pronto',
          turma,
          temas: Array.isArray(temas)
            ? temas
            : [],
          mensagem: '',
        })
      } catch (error) {
        if (!componentActive) {
          return
        }

        setPagina({
          status: 'erro',
          turma: null,
          temas: [],
          mensagem:
            error?.response?.data?.error
              ?.message ??
            'Não foi possível carregar esta turma.',
        })
      }
    }

    carregarTurma()

    return () => {
      componentActive = false
    }
  }, [turmaId])

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
          className="absolute inset-0 -z-10 bg-lexis-900"
        />

        <div className="mx-auto max-w-7xl">
          <Link
            to="/professor/turmas"
            className="inline-flex items-center gap-2 rounded-full border border-lexis-300/20 bg-lexis-950/40 px-4 py-2 text-sm font-semibold text-lexis-200 transition hover:border-lexis-300/50 hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Voltar às turmas
          </Link>

          {pagina.status ===
            'carregando' && (
            <div className="mt-12 animate-pulse">
              <div className="h-4 w-32 rounded bg-lexis-300/20" />
              <div className="mt-5 h-14 max-w-xl rounded bg-lexis-200/15" />
              <div className="mt-5 h-5 max-w-md rounded bg-lexis-200/10" />
            </div>
          )}

          {pagina.status === 'erro' && (
            <div className="mt-12 max-w-2xl rounded-2xl border border-red-300/20 bg-red-950/20 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-200">
                Não foi possível abrir a turma
              </p>

              <p className="mt-3 leading-7 text-red-100">
                {pagina.mensagem}
              </p>
            </div>
          )}

          {pagina.status === 'pronto' && (
            <div className="mt-12">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-lexis-300">
                Visão da turma
              </p>

              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                {pagina.turma.nome}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-lexis-100 sm:text-lg">
                Organize temas, acompanhe as
                entregas e gerencie os
                participantes desta turma.
              </p>

              <dl className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-xl border border-lexis-200/10 bg-lexis-950/45 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-lexis-300">
                    Código de acesso
                  </dt>

                  <dd className="mt-1 font-mono text-lg font-bold text-white">
                    {
                      pagina.turma
                        .codigoAcesso
                    }
                  </dd>
                </div>

                <div className="rounded-xl border border-lexis-200/10 bg-lexis-950/45 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-lexis-300">
                    Alunos ativos
                  </dt>

                  <dd className="mt-1 text-lg font-bold text-white">
                    {pagina.turma
                      .quantidadeAlunosAtivos ??
                      0}
                  </dd>
                </div>

                <div className="rounded-xl border border-lexis-200/10 bg-lexis-950/45 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.16em] text-lexis-300">
                    Situação
                  </dt>

                  <dd className="mt-1 text-lg font-bold text-white">
                    {pagina.turma.ativa
                      ? 'Ativa'
                      : 'Arquivada'}
                  </dd>
                </div>
              </dl>

              {pagina.turma.ativa && (
                <Link
                  to={`/professor/turmas/${turmaId}/temas/novo`}
                  className="mt-8 inline-flex min-h-12 items-center rounded-[10px] bg-lexis-400 px-5 font-bold text-white transition hover:bg-lexis-300 hover:text-lexis-950"
                >
                  Criar tema de redação
                </Link>
              )}
            </div>
          )}
        </div>
      </motion.section>

      {pagina.status ===
        'carregando' && (
        <ContentRail
          eyebrow="Produção textual"
          title="Temas da turma"
          description="Carregando os temas cadastrados."
        >
          {[0, 1, 2].map((item) => (
            <TemaSkeleton key={item} />
          ))}
        </ContentRail>
      )}

      {pagina.status === 'pronto' && (
        <ContentRail
          eyebrow="Produção textual"
          title="Temas da turma"
          description="Acompanhe os prazos e a quantidade de redações recebidas em cada proposta."
          emptyMessage="Esta turma ainda não possui temas de redação."
        >
          {pagina.temas.map(
            (tema, index) => (
              <ContentCard
			  key={tema.id}
			  eyebrow="Tema de redação"
			  title={tema.enunciado}
			  description={
							tema.descricao ??
							'Nenhuma descrição adicional foi cadastrada.'
						}
			status={obterStatusTema(tema)}
			details={[
				`${tema.quantidadeRedacoes ?? 0} redações`,
				`${tema.criterios?.length ?? 0} critérios`,
				`Prazo: ${formatarPrazo(tema.prazoEntrega)}`,
				]}
				accentIndex={index}
				to={`/professor/temas/${tema.id}`}
				actionLabel="Abrir tema"
				/>
            ),
          )}
        </ContentRail>
      )}
    </DashboardLayout>
  )
}
