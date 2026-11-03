import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router'
import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import { listarTemasDaTurma } from '../../services/temas.js'
import { obterTurma } from '../../services/turmas.js'
import './professor-turmas.css'
import './professor-turma.css'

function formatarPrazo(valor) {
  if (!valor) {
    return 'Prazo indisponível'
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return 'Prazo indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(data)
}

function obterStatusTema(tema) {
  if (!tema.ativo) {
    return 'Arquivado'
  }

  const prazo = new Date(tema.prazoEntrega).getTime()

  if (Number.isFinite(prazo) && prazo < Date.now()) {
    return 'Prazo encerrado'
  }

  return 'Recebendo redações'
}

function TemaCard({ tema, indice }) {
  const redacoes = tema.quantidadeRedacoes ?? 0
  const criterios = tema.criterios?.length ?? 0

  return (
    <li className={`class-card class-accent-${tema.ativo ? indice % 3 : 'archived'}`}>
      <Link
        to={`/professor/temas/${tema.id}`}
        className="class-card-link"
        aria-label={`Abrir tema ${tema.enunciado}`}
      >
        <div className="class-card-info">
          <h2>{tema.enunciado}</h2>
          <p>{tema.descricao ?? 'Nenhuma descrição adicional foi cadastrada.'}</p>
          <p>
            {redacoes} {redacoes === 1 ? 'redação' : 'redações'}
            <span aria-hidden="true"> · </span>
            {criterios} {criterios === 1 ? 'critério' : 'critérios'}
            <span aria-hidden="true"> · </span>
            Prazo: {formatarPrazo(tema.prazoEntrega)}
          </p>
        </div>
        <div className="class-card-actions">
          <span className="class-badge">{obterStatusTema(tema)}</span>
          <span className="class-open" aria-hidden="true">Abrir ›</span>
        </div>
      </Link>
    </li>
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
        const [turma, temas] = await Promise.all([
          obterTurma(turmaId),
          listarTemasDaTurma(turmaId),
        ])

        if (!componentActive) {
          return
        }

        setPagina({
          status: 'pronto',
          turma,
          temas: Array.isArray(temas) ? temas : [],
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
            error?.response?.data?.error?.message ??
            'Não foi possível carregar esta turma.',
        })
      }
    }

    carregarTurma()

    return () => {
      componentActive = false
    }
  }, [turmaId])

  const pronto = pagina.status === 'pronto'

  return (
    <ProfessorWorkspaceLayout
      secao="Turmas"
      turmas={pronto ? [pagina.turma] : []}
      pronto={pronto}
    >
      <motion.main
        id="panel-main"
        tabIndex={-1}
        className="panel-main turma-main"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .22 }}
        aria-busy={pagina.status === 'carregando'}
      >
        <Link to="/professor/turmas" className="panel-soft-button turma-back">
          <span aria-hidden="true">←</span>&nbsp;Voltar às turmas
        </Link>

        {pagina.status === 'carregando' && (
          <>
            <h1>Turma</h1>
            <p role="status" className="panel-subtitle">Carregando a turma…</p>
            <div className="panel-stats turma-stats" aria-hidden="true">
              {[0, 1, 2].map((item) => (
                <div key={item} className="panel-stat skeleton-block" />
              ))}
            </div>
            <ul className="classes-grid" aria-hidden="true">
              {[0, 1, 2].map((item) => (
                <li key={item} className="class-card skeleton-block" />
              ))}
            </ul>
          </>
        )}

        {pagina.status === 'erro' && (
          <>
            <h1>Turma</h1>
            <section className="panel-error" role="alert">
              <h2>Não foi possível abrir a turma</h2>
              <p>{pagina.mensagem}</p>
            </section>
          </>
        )}

        {pronto && (
          <>
            <p className="turma-eyebrow">Visão da turma</p>
            <div className="turma-heading">
              <div>
                <h1>{pagina.turma.nome}</h1>
                <p className="panel-subtitle">
                  Organize temas, acompanhe as entregas e gerencie os
                  participantes desta turma.
                </p>
              </div>
              {pagina.turma.ativa && (
                <Link
                  to={`/professor/turmas/${turmaId}/temas/novo`}
                  className="panel-primary-button turma-create"
                >
                  Criar tema de redação
                </Link>
              )}
            </div>

            <dl className="panel-stats turma-stats" aria-label="Indicadores da turma">
              <div className="panel-stat">
                <dt>Código de acesso</dt>
                <dd className="turma-codigo">{pagina.turma.codigoAcesso}</dd>
              </div>
              <div className="panel-stat">
                <dt>Alunos ativos</dt>
                <dd>{pagina.turma.quantidadeAlunosAtivos ?? 0}</dd>
              </div>
              <div className="panel-stat">
                <dt>Situação</dt>
                <dd>{pagina.turma.ativa ? 'Ativa' : 'Arquivada'}</dd>
              </div>
            </dl>

            <section className="panel-attention turma-temas" aria-labelledby="turma-temas-title">
              <h2 id="turma-temas-title">Temas da turma</h2>
              <p>Acompanhe os prazos e a quantidade de redações recebidas em cada proposta.</p>
              {pagina.temas.length ? (
                <ul className="classes-grid">
                  {pagina.temas.map((tema, indice) => (
                    <TemaCard key={tema.id} tema={tema} indice={indice} />
                  ))}
                </ul>
              ) : (
                <div className="panel-empty">
                  <h3>Esta turma ainda não possui temas de redação.</h3>
                </div>
              )}
            </section>
          </>
        )}
      </motion.main>
    </ProfessorWorkspaceLayout>
  )
}
