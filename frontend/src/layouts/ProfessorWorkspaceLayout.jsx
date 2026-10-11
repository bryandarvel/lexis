import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import ThemeToggle from '../components/layout/ThemeToggle.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { obterIniciais } from '../utils/professor-dashboard.js'
import '../pages/professor/professor-dashboard.css'

function WorkspaceDialog({ tipo, usuario, turmas, onClose, onLogout, saindo }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    if (!tipo) return undefined
    const focoAnterior = document.activeElement
    const dialog = dialogRef.current
    dialog.showModal()
    return () => {
      dialog.close()
      focoAnterior?.focus?.()
    }
  }, [tipo])

  return (
    <dialog ref={dialogRef} className="professor-panel-dialog" aria-labelledby="panel-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!saindo) onClose() }}>
      <h2 id="panel-dialog-title">{tipo === 'perfil' ? 'Seu perfil' : 'Propostas por turma'}</h2>
      {tipo === 'perfil' ? (
        <dl>
          <dt>Nome</dt><dd>{usuario?.nome}</dd>
          <dt>E-mail</dt><dd>{usuario?.email}</dd>
          <dt>Perfil</dt><dd>Professor</dd>
        </dl>
      ) : (
        <>
          <p>Escolha uma turma para consultar suas propostas e critérios.</p>
          {turmas.length ? (
            <ul className="panel-dialog-classes">
              {turmas.map((turma) => <li key={turma.id}><Link to={`/professor/turmas/${turma.id}`}>{turma.nome}</Link></li>)}
            </ul>
          ) : <p>Nenhuma turma disponível. Acesse Turmas para começar.</p>}
        </>
      )}
      <div className="panel-dialog-actions">
        <button type="button" onClick={onClose} disabled={saindo} className="panel-soft-button">Fechar</button>
        {tipo === 'perfil' && <button type="button" onClick={onLogout} disabled={saindo} className="panel-primary-button">{saindo ? 'Saindo...' : 'Sair da conta'}</button>}
      </div>
    </dialog>
  )
}

export default function ProfessorWorkspaceLayout({ secao, cabecalho, turmas, pronto, onRedacoes, imersivo = false, indicador, children }) {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const [dialogo, setDialogo] = useState(null)
  const [saindo, setSaindo] = useState(false)
  const iniciais = obterIniciais(usuario?.nome)

  async function encerrarSessao() {
    if (saindo) return
    setSaindo(true)
    try { await sair() } catch {
      // AuthProvider limpa a sessão local mesmo quando o servidor não responde.
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className={`professor-panel${imersivo ? ' professor-panel-immersive' : ''}`}>
      <a className="panel-skip" href="#panel-main">Ir para o conteúdo</a>
      <header className="panel-header">
        <Link to="/professor" className="panel-wordmark">LÉXIS</Link>
        <span className="panel-header-divider" aria-hidden="true" />
        <span className="panel-header-label">{cabecalho ?? secao}</span>
        <div className="panel-header-tools">
          {indicador}
          <ThemeToggle compacto />
          <button type="button" className="panel-avatar" onClick={() => setDialogo('perfil')} aria-label="Abrir seu perfil">{iniciais}</button>
        </div>
      </header>
      {!imersivo && <aside className="panel-sidebar" aria-label="Área do professor">
        <nav aria-label="Navegação do professor">
          <Link to="/professor" aria-current={secao === 'Painel' ? 'page' : undefined}><span className="panel-nav-icon" aria-hidden="true" />Painel</Link>
          <Link to="/professor/turmas" aria-current={secao === 'Turmas' ? 'page' : undefined}><span className="panel-nav-icon" aria-hidden="true" />Turmas</Link>
          <button type="button" aria-current={secao === 'Propostas' ? 'page' : undefined} onClick={() => setDialogo('propostas')} disabled={!pronto}><span className="panel-nav-icon" aria-hidden="true" />Propostas</button>
          <button type="button" onClick={onRedacoes ?? (() => navigate('/professor'))}><span className="panel-nav-icon" aria-hidden="true" />Redações</button>
          <button type="button" onClick={() => setDialogo('perfil')}><span className="panel-nav-icon" aria-hidden="true" />Perfil</button>
        </nav>
        <button type="button" className="panel-sidebar-profile" onClick={() => setDialogo('perfil')}>
          <span className="panel-avatar" aria-hidden="true">{iniciais}</span>
          <span><strong>{usuario?.nome ?? 'Professor'}</strong><small>Professor</small></span>
        </button>
      </aside>}
      {children}
      <WorkspaceDialog tipo={dialogo} usuario={usuario} turmas={turmas} onClose={() => setDialogo(null)} onLogout={encerrarSessao} saindo={saindo} />
    </div>
  )
}
