import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router'

import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import { carregarPainelProfessor } from '../../services/professor-dashboard.js'
import { diasDesdeEnvio, obterIniciais } from '../../utils/professor-dashboard.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import './professor-dashboard.css'

function PainelSkeleton() {
  return (
    <div className="panel-skeleton" role="status" aria-label="Carregando indicadores e redações">
      <div className="panel-stats" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => <div className="panel-stat skeleton-block" key={item} />)}
      </div>
      <div className="panel-attention">
        <h2>Precisa da sua atenção</h2>
        <p>Redações aguardando correção há mais tempo</p>
        <div className="panel-pending-list" aria-hidden="true">
          {[0, 1, 2].map((item) => <div className="panel-pending skeleton-block" key={item} />)}
        </div>
      </div>
    </div>
  )
}

export default function ProfessorDashboardPage() {
  const [pagina, setPagina] = useState({ status: 'carregando', turmas: [], pendentes: [] })
  const [tentativa, setTentativa] = useState(0)
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const attentionRef = useRef(null)

  useEffect(() => {
    let ativo = true
    setPagina({ status: 'carregando', turmas: [], pendentes: [] })
    carregarPainelProfessor()
      .then((dados) => {
        if (ativo) setPagina({ status: 'pronto', ...dados })
      })
      .catch((error) => {
        if (ativo) setPagina({
          status: 'erro', turmas: [], pendentes: [],
          mensagem: interpretarErroApi(error, 'Não foi possível carregar o painel. Tente novamente.').mensagem,
        })
      })
    return () => { ativo = false }
  }, [tentativa])

  function abrirRedacoes() {
    setMostrarTodas(true)
    attentionRef.current?.focus()
    attentionRef.current?.scrollIntoView({ block: 'nearest' })
  }

  const data = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo',
  }).format(new Date())
  const indicadores = [
    ['Redações pendentes', pagina.pendentes.length, 'attention'],
    ['Turmas ativas', pagina.turmasAtivas, ''],
    ['Alunos cadastrados', pagina.alunosCadastrados, ''],
    ['Publicadas no mês', pagina.publicadasNoMes ?? '—', 'success'],
  ]
  const exibidas = mostrarTodas ? pagina.pendentes : pagina.pendentes.slice(0, 3)

  return (
    <ProfessorWorkspaceLayout secao="Painel" turmas={pagina.turmas} pronto={pagina.status === 'pronto'} onRedacoes={abrirRedacoes}>
      <motion.main
        id="panel-main"
        tabIndex={-1}
        className="panel-main"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .22 }}
      >
        <h1>Painel</h1>
        <p className="panel-subtitle">
          <span>{data.charAt(0).toUpperCase() + data.slice(1)}</span>
          {pagina.status === 'pronto' && <> · {pagina.turmasAtivas} {pagina.turmasAtivas === 1 ? 'turma ativa' : 'turmas ativas'}</>}
        </p>
        {pagina.status === 'carregando' ? <PainelSkeleton /> : pagina.status === 'erro' ? (
          <section className="panel-error" role="alert">
            <h2>Não foi possível carregar o painel</h2>
            <p>{pagina.mensagem}</p>
            <button type="button" className="panel-primary-button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
          </section>
        ) : (
          <>
            <dl className="panel-stats" aria-label="Indicadores do professor">
              {indicadores.map(([rotulo, valor, estilo]) => (
                <div key={rotulo} className="panel-stat">
                  <dt>{rotulo}</dt>
                  <dd className={estilo}>{valor}</dd>
                </div>
              ))}
            </dl>
            {pagina.publicadasNoMes === null && (
              <p role="status" className="panel-publication-warning">
                O histórico de publicações não respondeu. Os demais dados estão disponíveis.
                <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>Atualizar</button>
              </p>
            )}
            <section className="panel-attention" aria-labelledby="panel-attention-title">
              <h2 id="panel-attention-title" ref={attentionRef} tabIndex={-1}>Precisa da sua atenção</h2>
              <p>Redações aguardando correção há mais tempo</p>
              {exibidas.length ? (
                <ul className="panel-pending-list">
                  {exibidas.map((redacao) => {
                    const dias = diasDesdeEnvio(redacao.enviadaEm)
                    return (
                      <li key={redacao.id} className="panel-pending">
                        <span className="panel-student-avatar" aria-hidden="true">{obterIniciais(redacao.aluno?.nome)}</span>
                        <div className="panel-student">
                          <strong>{redacao.aluno?.nome ?? 'Aluno'}</strong>
                          <span>{redacao.turma.nome} · {redacao.tema?.enunciado ?? 'Proposta de redação'}</span>
                        </div>
                        <span className={`panel-wait ${dias >= 5 ? 'overdue' : dias >= 3 ? 'attention' : ''}`}>
                          {dias === null ? 'Data indisponível' : dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`}
                        </span>
                        <Link className="panel-soft-button" to={`/professor/redacoes/${redacao.id}`} aria-label={`Corrigir redação de ${redacao.aluno?.nome ?? 'aluno'}`}>Corrigir</Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="panel-empty">
                  <h3>{pagina.turmas.length ? 'Nenhuma redação pendente' : 'Comece pelas suas turmas'}</h3>
                  <p>{pagina.turmas.length ? 'As redações enviadas pelos alunos aparecerão aqui para correção.' : 'Acesse Turmas para organizar alunos e propostas de redação.'}</p>
                  <Link to="/professor/turmas" className="panel-soft-button">Ver turmas</Link>
                </div>
              )}
              {pagina.pendentes.length > 3 && (
                <button type="button" className="panel-more" onClick={() => setMostrarTodas((valor) => !valor)}>
                  {mostrarTodas ? 'Mostrar apenas as três mais antigas' : `Ver todas as ${pagina.pendentes.length} pendentes`}
                </button>
              )}
            </section>
          </>
        )}
      </motion.main>
    </ProfessorWorkspaceLayout>
  )
}
