import { formatarData, formatarSaudacaoData } from '../../utils/formatar-data.js'
import EstadoVazio from '../../components/base/EstadoVazio.jsx'
import { useEffect, useRef, useState } from 'react'
import Botao from '../../components/base/Botao.jsx'
import { Link } from 'react-router'

import AppShell from '../../layouts/AppShell.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { carregarPainelProfessor, listarPrazosProfessor } from '../../services/professor-dashboard.js'
import {
  descreverFilaFiltrada,
  descreverIndicadoresDoPainel,
  descreverSituacaoDaTurma,
  diasDesdeEnvio,
  filtrarFilaPorTurma,
  obterIniciais,
  turmaDoFiltroAindaExiste,
} from '../../utils/professor-dashboard.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import './professor-dashboard.css'

const POR_PAGINA = 6

function PainelSkeleton() {
  return (
    <div className="panel-skeleton" role="status" aria-label="Carregando indicadores e redações">
      <div className="panel-attention">
        <h2>Para corrigir</h2>
        <p>Redações aguardando correção há mais tempo</p>
        <div className="panel-pending-list" aria-hidden="true">
          {[0, 1, 2].map((item) => <div className="panel-pending skeleton-block" key={item} />)}
        </div>
      </div>
    </div>
  )
}

function descreverEspera(dias) {
  return dias === null ? 'Data indisponível' : dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}

function Prioridade({ redacao, onIrParaFila }) {
  return (
    <section className="panel-resumo-card panel-prioridade" aria-labelledby="panel-prioridade-title">
      <h2 id="panel-prioridade-title">Correção mais antiga</h2>
      {redacao ? (
        <>
          <p className="panel-prioridade-espera">Aguardando correção · {descreverEspera(diasDesdeEnvio(redacao.enviadaEm))}</p>
          <strong className="panel-prioridade-aluno">{redacao.aluno?.nome ?? 'Aluno'}</strong>
          <p className="panel-prioridade-proposta">{redacao.turma.nome} · {redacao.tema?.enunciado ?? 'Proposta de redação'}</p>
          <div className="panel-prioridade-acoes">
            <Botao as={Link} to={`/professor/redacoes/${redacao.id}`}>Corrigir</Botao>
            <Botao type="button" variante="secundario" onClick={onIrParaFila}>Ir para a fila</Botao>
          </div>
        </>
      ) : (
        <p className="panel-resumo-mensagem">Nenhuma redação aguarda correção.</p>
      )}
    </section>
  )
}

function Prazos({ resultado, onTentar }) {
  return (
    <section className="panel-resumo-card" aria-labelledby="panel-prazos-title">
      <h2 id="panel-prazos-title">Prazos dos próximos 7 dias</h2>
      {resultado.status === 'carregando' ? (
        <p className="panel-resumo-mensagem" role="status">Carregando prazos…</p>
      ) : resultado.status === 'erro' ? (
        <>
          <p className="panel-resumo-mensagem" role="status">Não foi possível carregar os prazos.</p>
          <Botao type="button" variante="secundario" onClick={onTentar}>Tentar carregar prazos novamente</Botao>
        </>
      ) : resultado.itens.length ? (
        <ul className="panel-prazos">
          {resultado.itens.map((prazo) => {
            const dataHora = formatarData(prazo.prazoEntrega, 'dataHora')
            const [data, hora] = dataHora.split(', ')
            return (
              <li key={prazo.id}>
                <time dateTime={prazo.prazoEntrega}>
                  <span className="sr-only">{dataHora}</span>
                  <strong aria-hidden="true">{data.slice(0, 5)}</strong>
                  <span aria-hidden="true">{hora}</span>
                </time>
                <div>
                  <Link to={`/professor/temas/${prazo.id}`}>{prazo.enunciado}</Link>
                  <p>{prazo.turmaNome} · {prazo.entregaram} de {prazo.alunosAtivos} entregaram</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="panel-resumo-mensagem" role="status">Nenhuma proposta vence nos próximos 7 dias.</p>
      )}
    </section>
  )
}

export default function ProfessorDashboardPage() {
  const { usuario } = useAuth()
  return <PainelProfessor key={usuario?.id} />
}

function PainelProfessor() {
  const [pagina, setPagina] = useState({ status: 'carregando', turmas: [], pendentes: [], porTurma: [] })
  const [tentativa, setTentativa] = useState(0)
  const [tentativaPrazos, setTentativaPrazos] = useState(0)
  const [prazos, setPrazos] = useState({ status: 'carregando' })
  const [indiceFila, setIndiceFila] = useState(0)
  // Issue #194: a fila pode ser recortada por turma. Guarda-se o id; a turma
  // em si sai sempre de porTurma, que o painel ja carregou.
  const [turmaFiltro, setTurmaFiltro] = useState(null)
  const attentionRef = useRef(null)

  useEffect(() => {
    let ativo = true
    const controle = new AbortController()
    setPagina({ status: 'carregando', turmas: [], pendentes: [], porTurma: [] })
    carregarPainelProfessor({
      signal: controle.signal,
      aoCarregarFila: (dados) => {
        if (ativo) setPagina({ status: 'pronto', carregandoPublicadas: true, ...dados })
      },
    })
      .then((dados) => {
        if (ativo) setPagina({ status: 'pronto', ...dados })
      })
      .catch((error) => {
        if (ativo) setPagina({
          status: 'erro', turmas: [], pendentes: [], porTurma: [],
          mensagem: interpretarErroApi(error, 'Não foi possível carregar o painel. Tente novamente.').mensagem,
        })
      })
    return () => { ativo = false; controle.abort() }
  }, [tentativa])

  useEffect(() => {
    const controle = new AbortController()
    listarPrazosProfessor({ signal: controle.signal })
      .then((itens) => {
        if (!controle.signal.aborted) setPrazos({ status: 'pronto', itens })
      })
      .catch(() => {
        if (!controle.signal.aborted) setPrazos({ status: 'erro' })
      })
    return () => controle.abort()
  }, [tentativaPrazos])

  function irParaFila(indice = 0) {
    setIndiceFila(indice)
    attentionRef.current?.focus()
    attentionRef.current?.scrollIntoView({ block: 'nearest' })
  }

  /*
   * O filtro vem de "Situacao por turma", que fica abaixo da fila: ligar sem
   * levar o professor ate la pareceria que nada aconteceu. Desligar nao move
   * ninguem, para o botao que se acabou de soltar continuar sob a mao.
   */
  function alternarTurma(id) {
    const ligando = turmaFiltro !== id

    setTurmaFiltro(ligando ? id : null)
    if (ligando) irParaFila(0)
    else setIndiceFila(0)
  }

  function verTodasAsTurmas() {
    setTurmaFiltro(null)
    irParaFila(0)
  }

  function escolherFiltro(id) {
    setTurmaFiltro(id)
    setIndiceFila(0)
  }

  const data = formatarSaudacaoData()
  // Uma turma que saiu do painel (arquivada, excluida ou de outra conta) nao
  // pode deixar a fila vazia sem explicacao: o filtro morre com ela.
  const filtroAtivo = turmaDoFiltroAindaExiste(pagina.porTurma, turmaFiltro) ? turmaFiltro : null
  const fila = filtrarFilaPorTurma(pagina.pendentes, filtroAtivo)
  const recorte = descreverFilaFiltrada(pagina.porTurma, filtroAtivo, fila.length)
  const totalPaginas = Math.max(1, Math.ceil(fila.length / POR_PAGINA))
  const indice = Math.min(indiceFila, totalPaginas - 1)
  const exibidas = fila.slice(indice * POR_PAGINA, (indice + 1) * POR_PAGINA)

  return (
    <AppShell conteudo="amplo" trilha={['Painel']}>
      <div
        className="panel-main"
      >
        <h1>Painel</h1>
        <p className="panel-subtitle">
          <span>{data.charAt(0).toUpperCase() + data.slice(1)}</span>
        </p>
        {pagina.status === 'carregando' ? <PainelSkeleton /> : pagina.status === 'erro' ? (
          <section className="panel-error" role="alert">
            <h2>Não foi possível carregar o painel</h2>
            <p>{pagina.mensagem}</p>
            <Botao type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</Botao>
          </section>
        ) : (
          <>
            <dl className="panel-stats">
              {descreverIndicadoresDoPainel(pagina).map((item) => (
                <div key={item.rotulo} className="panel-stat">
                  <dt>{item.rotulo}</dt>
                  <dd>{item.valor}</dd>
                </div>
              ))}
            </dl>
            <div className="panel-resumo">
              <Prioridade redacao={pagina.pendentes[0]} onIrParaFila={verTodasAsTurmas} />
              <Prazos resultado={prazos} onTentar={() => {
                setPrazos({ status: 'carregando' })
                setTentativaPrazos((valor) => valor + 1)
              }} />
            </div>
            <section className="panel-attention" aria-labelledby="panel-attention-title">
              <div className="panel-fila-cabecalho">
                <div>
                  <h2 id="panel-attention-title" ref={attentionRef} tabIndex={-1}>
                    {recorte ? recorte.titulo : `Para corrigir (${fila.length})`}
                  </h2>
                  <p>{recorte ? recorte.descricao : 'Redações aguardando correção há mais tempo'}</p>
                </div>
                {recorte && (
                  <Botao type="button" variante="secundario" onClick={verTodasAsTurmas}>Ver todas as turmas</Botao>
                )}
              </div>
              {pagina.porTurma.length > 1 && (
                <div className="panel-fila-filtros" role="group" aria-label="Filtrar a fila por turma">
                  <button type="button" className="panel-turma-filtro" aria-pressed={filtroAtivo === null} onClick={() => escolherFiltro(null)}>Todas as turmas</button>
                  {pagina.porTurma.map((turma) => (
                    <button
                      key={turma.id}
                      type="button"
                      className="panel-turma-filtro"
                      aria-pressed={filtroAtivo === turma.id}
                      onClick={() => escolherFiltro(turma.id)}
                    >
                      {turma.nome}
                    </button>
                  ))}
                </div>
              )}
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
                          {descreverEspera(dias)}
                        </span>
                        <Botao as={Link} variante="secundario" to={`/professor/redacoes/${redacao.id}`} aria-label={`Corrigir redação de ${redacao.aluno?.nome ?? 'aluno'}`}>Corrigir</Botao>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                recorte ? (
                  <EstadoVazio
                    nivel={3}
                    titulo={`Nenhuma redação de ${recorte.nome} aguardando correção`}
                    descricao="As outras turmas podem ter redações na fila."
                    acao={<Botao type="button" variante="secundario" onClick={verTodasAsTurmas}>Ver todas as turmas</Botao>}
                  />
                ) : (
                  <EstadoVazio
                    nivel={3}
                    titulo={pagina.turmas.length ? 'Nenhuma redação aguardando correção' : 'Comece pelas suas turmas'}
                    descricao={pagina.turmas.length ? 'As redações enviadas pelos alunos aparecerão aqui para correção.' : 'Acesse Turmas para organizar alunos e propostas de redação.'}
                    acao={<Botao as={Link} to="/professor/turmas" variante="secundario">Ver turmas</Botao>}
                  />
                )
              )}
              {totalPaginas > 1 && <nav className="panel-pagination" aria-label="Páginas de redações pendentes">
                <Botao variante="secundario" disabled={indice === 0} onClick={() => irParaFila(indice - 1)}>Anterior</Botao>
                <span role="status">Página {indice + 1} de {totalPaginas}</span>
                <Botao variante="secundario" disabled={indice + 1 >= totalPaginas} onClick={() => irParaFila(indice + 1)}>Próxima</Botao>
              </nav>}
            </section>
            <section className="panel-turmas" aria-labelledby="panel-turmas-title">
              <h2 id="panel-turmas-title">Situação por turma</h2>
              <p>Onde está a espera, turma a turma. Use “Filtrar a fila” para ver só as redações de uma delas.</p>
              {pagina.porTurma.length ? (
                <ul className="panel-turmas-lista">
                  {pagina.porTurma.map((turma) => (
                    <li key={turma.id} className="panel-turma" data-filtrada={filtroAtivo === turma.id || undefined}>
                      <Link to={`/professor/turmas/${turma.id}`}>{turma.nome}</Link>
                      <dl>
                        {descreverSituacaoDaTurma(turma).map((item) => (
                          <div key={item.rotulo} data-tom={item.tom}>
                            <dt>{item.rotulo}</dt>
                            <dd>{item.valor}</dd>
                          </div>
                        ))}
                      </dl>
                      {/* A fila sai dos mesmos dados ja carregados: filtrar nao
                          faz chamada nenhuma. Sem nada aguardando nao ha o que
                          mostrar, e o botao diria o contrario. */}
                      <button
                        type="button"
                        className="panel-turma-filtro"
                        aria-pressed={filtroAtivo === turma.id}
                        disabled={turma.aguardando === 0}
                        title={turma.aguardando === 0 ? 'Nenhuma redação aguardando nesta turma.' : undefined}
                        onClick={() => alternarTurma(turma.id)}
                      >
                        Filtrar a fila<span className="sr-only"> por {turma.nome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EstadoVazio
                  nivel={3}
                  titulo="Nenhuma turma ativa"
                  descricao="Turmas arquivadas não aparecem aqui. Crie uma turma para acompanhar a situação das redações."
                  acao={<Botao as={Link} to="/professor/turmas" variante="secundario">Ver turmas</Botao>}
                />
              )}
            </section>
            {pagina.carregandoPublicadas && <p role="status" className="panel-publication-warning">Carregando histórico de publicações…</p>}
            {!pagina.carregandoPublicadas && pagina.publicadasNoMes === null && (
              <p role="status" className="panel-publication-warning">
                O histórico de publicações não respondeu. A fila continua disponível.
                <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>Atualizar</button>
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
