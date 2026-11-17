import Etiqueta from '../../components/base/Etiqueta.jsx'
import EstadoVazio from '../../components/base/EstadoVazio.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Aviso from '../../components/base/Aviso.jsx'
import Botao from '../../components/base/Botao.jsx'
import Campo from '../../components/base/Campo.jsx'
import Dialogo from '../../components/base/Dialogo.jsx'
import AppShell from '../../layouts/AppShell.jsx'
import { carregarTurmasProfessor } from '../../services/professor-classes.js'
import { criarTurma } from '../../services/turmas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import { filtrarTurmas, prepararNomeTurma, resumirRedacoesTurma } from '../../utils/professor-classes.js'
import './professor-turmas.css'

function NovaTurmaDialog({ onClose, onCreated }) {
  const nomeRef = useRef(null)
  const enviandoRef = useRef(false)
  const [nome, setNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState({ mensagem: '', campo: '' })

  useEffect(() => {
    if (!enviando && (erro.campo || erro.mensagem)) nomeRef.current?.focus()
  }, [enviando, erro])

  async function enviar(event) {
    event.preventDefault()
    if (enviandoRef.current) return
    const preparado = prepararNomeTurma(nome)
    if (preparado.erro) {
      setErro({ mensagem: '', campo: preparado.erro })
      nomeRef.current?.focus()
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    setErro({ mensagem: '', campo: '' })
    try {
      const turma = await criarTurma(preparado.nome)
      onCreated({ ...turma, resumo: resumirRedacoesTurma([]) })
    } catch (error) {
      const interpretado = interpretarErroApi(error, 'Não foi possível criar a turma. Tente novamente.')
      setErro({ mensagem: interpretado.mensagem, campo: interpretado.campos.nome ?? '' })
      nomeRef.current?.focus()
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <Dialogo
      aberto
      onFechar={() => { if (!enviandoRef.current) onClose() }}
      titulo="Nova turma"
      descricao="Defina o nome da turma. O código de acesso será gerado automaticamente."
    >
      <form onSubmit={enviar} noValidate aria-busy={enviando} className="space-y-4">
        <Campo
          ref={nomeRef}
          id="class-name"
          label="Nome da turma"
          value={nome}
          maxLength={100}
          autoComplete="off"
          disabled={enviando}
          required
          error={erro.campo}
          hint="Entre 2 e 100 caracteres."
          onChange={(event) => { setNome(event.target.value); setErro({ mensagem: '', campo: '' }) }}
        />
        {erro.mensagem && <Aviso tipo="erro">{erro.mensagem}</Aviso>}
        <div className="dialogo-base__rodape">
          <Botao variante="secundario" disabled={enviando} onClick={onClose}>Cancelar</Botao>
          <Botao type="submit" carregando={enviando} rotuloCarregando="Criando...">Criar turma</Botao>
        </div>
      </form>
    </Dialogo>
  )
}

function TurmaCard({ turma }) {
  const resumo = turma.resumo
  const estado = !turma.ativa ? 'Arquivada' : !resumo ? 'Dados indisponíveis' : resumo.pendentes ? `${resumo.pendentes} ${resumo.pendentes === 1 ? 'pendente' : 'pendentes'}` : 'Em dia'
  const alunos = turma.quantidadeAlunosAtivos ?? 0
  return (
    <li className="class-card">
      <Link to={`/professor/turmas/${turma.id}`} className="class-card-link" aria-label={`Abrir turma ${turma.nome}`}>
        <div className="class-card-info">
          <h2>{turma.nome}</h2>
          <p>{alunos} {alunos === 1 ? 'aluno' : 'alunos'} · <span>{turma.codigoAcesso}</span></p>
          {resumo ? (
            <div className="class-progress" role="progressbar" aria-label={`Redações avaliadas em ${turma.nome}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumo.progresso}
              aria-valuetext={`${resumo.avaliadas} de ${resumo.total} redações avaliadas`} title={`${resumo.avaliadas} de ${resumo.total} redações avaliadas`}>
              <span style={{ width: `${resumo.progresso}%` }} />
            </div>
          ) : <span className="class-metrics-unavailable">Indicadores indisponíveis</span>}
        </div>
        <div className="class-card-actions">
          <Etiqueta tom={turma.ativa && resumo?.pendentes ? 'atencao' : 'neutro'} className="min-w-[120px] justify-center">{estado}</Etiqueta>
          <span className="class-open" aria-hidden="true">Abrir ›</span>
        </div>
      </Link>
    </li>
  )
}

export default function ProfessorTurmasPage() {
  const [pagina, setPagina] = useState({ status: 'carregando', turmas: [] })
  const [tentativa, setTentativa] = useState(0)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [criando, setCriando] = useState(false)
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    let ativo = true
    setPagina({ status: 'carregando', turmas: [] })
    carregarTurmasProfessor().then((turmas) => {
      if (ativo) setPagina({ status: 'pronto', turmas })
    }).catch((error) => {
      if (ativo) setPagina({ status: 'erro', turmas: [], mensagem: interpretarErroApi(error, 'Verifique sua conexão com a API e tente novamente.').mensagem })
    })
    return () => { ativo = false }
  }, [tentativa])

  function turmaCriada(turma) {
    setPagina((atual) => ({ status: 'pronto', turmas: [turma, ...atual.turmas] }))
    setBusca('')
    setFiltro('todas')
    setSucesso(`Turma “${turma.nome}” criada. Código de acesso: ${turma.codigoAcesso}.`)
    setCriando(false)
  }

  const filtradas = filtrarTurmas(pagina.turmas, busca, filtro)
  const pronto = pagina.status === 'pronto'

  return (
    <AppShell conteudo="amplo" trilha={['Turmas']} turmas={pagina.turmas} pronto={pronto}>
      <div className="panel-main classes-main">
        <div className="classes-heading">
          <div><h1>Turmas</h1><p className="panel-subtitle">Gerencie turmas, códigos de acesso e propostas.</p></div>
          <Botao type="button" className="classes-create" disabled={!pronto} onClick={() => { setSucesso(''); setCriando(true) }}>+ Nova turma</Botao>
        </div>
        <div className="classes-toolbar">
          <label className="classes-search"><span className="sr-only">Buscar turma ou código de acesso</span>
            <input type="search" className="class-input" placeholder="Buscar turma ou código de acesso..." value={busca} disabled={!pronto} onChange={(event) => setBusca(event.target.value)} />
          </label>
          <div className="classes-filters" role="group" aria-label="Filtrar turmas por situação">
            {[['todas', 'Todas'], ['ativas', 'Ativas'], ['arquivadas', 'Arquivadas']].map(([valor, rotulo]) => (
              <button key={valor} type="button" aria-pressed={filtro === valor} disabled={!pronto} onClick={() => setFiltro(valor)}>{rotulo}</button>
            ))}
          </div>
        </div>
        {sucesso && <p className="classes-success" role="status">{sucesso}</p>}
        {pagina.status === 'carregando' ? (
          <div className="classes-grid" role="status" aria-label="Carregando turmas">{[0, 1, 2, 3].map((item) => <div key={item} className="class-card skeleton-block" aria-hidden="true" />)}</div>
        ) : pagina.status === 'erro' ? (
          <section className="panel-error" role="alert"><h2>Não foi possível carregar as turmas</h2><p>{pagina.mensagem}</p><Botao type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</Botao></section>
        ) : (
          <>
            {pagina.turmas.some((turma) => !turma.resumo) && <p className="class-partial-warning" role="status">Alguns indicadores não responderam. As turmas continuam disponíveis. <button type="button" onClick={() => setTentativa((valor) => valor + 1)}>Atualizar indicadores</button></p>}
            <span className="sr-only" role="status">{filtradas.length} {filtradas.length === 1 ? 'turma encontrada' : 'turmas encontradas'}</span>
            {filtradas.length ? <ul className="classes-grid">{filtradas.map((turma) => <TurmaCard key={turma.id} turma={turma} />)}</ul> : (
              <EstadoVazio
                titulo={pagina.turmas.length ? 'Nenhuma turma encontrada' : 'Você ainda não tem turmas'}
                descricao={pagina.turmas.length ? 'Tente outro nome, código ou filtro.' : 'Crie sua primeira turma e compartilhe o código de acesso com os alunos.'}
                acao={pagina.turmas.length ? <Botao type="button" variante="secundario" onClick={() => { setBusca(''); setFiltro('todas') }}>Limpar filtros</Botao> : <Botao type="button" onClick={() => setCriando(true)}>Criar primeira turma</Botao>}
              />
            )}
          </>
        )}
        {criando && <NovaTurmaDialog onClose={() => setCriando(false)} onCreated={turmaCriada} />}
      </div>
    </AppShell>
  )
}
