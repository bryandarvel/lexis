import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import ThemeToggle from '../components/layout/ThemeToggle.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useNotificacoesNaoLidas } from '../hooks/useNotificacoesNaoLidas.js'
import { listarNotificacoesProfessor } from '../services/notificacoes-professor.js'
import { obterIniciais } from '../utils/professor-dashboard.js'
import '../pages/professor/professor-dashboard.css'

// turmas tem padrão porque nem toda tela do painel carrega a lista.
function WorkspaceDialog({ tipo, turmas = [], onClose }) {
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
      onCancel={(event) => { event.preventDefault(); onClose() }}>
      <h2 id="panel-dialog-title">Propostas por turma</h2>
      <p>Escolha uma turma para consultar suas propostas e critérios.</p>
      {turmas.length ? (
        <ul className="panel-dialog-classes">
          {turmas.map((turma) => <li key={turma.id}><Link to={`/professor/turmas/${turma.id}`}>{turma.nome}</Link></li>)}
        </ul>
      ) : <p>Nenhuma turma disponível. Acesse Turmas para começar.</p>}
      <div className="panel-dialog-actions">
        <button type="button" onClick={onClose} className="panel-soft-button">Fechar</button>
      </div>
    </dialog>
  )
}

export default function ProfessorWorkspaceLayout({ secao, cabecalho, turmas, pronto, onRedacoes, imersivo = false, indicador, children }) {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [dialogo, setDialogo] = useState(null)
  const iniciais = obterIniciais(usuario?.nome)
  const totalNaoLidas = useNotificacoesNaoLidas({
    habilitado: usuario?.papel === 'PROFESSOR',
    listar: listarNotificacoesProfessor,
  })
  const rotuloNotificacoes =
    totalNaoLidas === 0
      ? 'Notificações: nenhum aviso não lido'
      : totalNaoLidas === 1
        ? 'Notificações: 1 aviso não lido'
        : `Notificações: ${totalNaoLidas} avisos não lidos`

  return (
    <div className={`professor-panel${imersivo ? ' professor-panel-immersive' : ''}`}>
      <a className="panel-skip" href="#panel-main">Ir para o conteúdo</a>
      <header className="panel-header">
        <Link to="/professor" className="panel-wordmark">LÉXIS</Link>
        <span className="panel-header-divider" aria-hidden="true" />
        <span className="panel-header-label">{cabecalho ?? secao}</span>
        <div className="panel-header-tools">
          {indicador}
          <Link to="/professor/notificacoes" className="panel-sino" aria-label={rotuloNotificacoes}>
            <span aria-hidden="true">🔔</span>
            {totalNaoLidas > 0 && <span className="panel-sino-contagem" aria-hidden="true">{totalNaoLidas > 99 ? '99+' : totalNaoLidas}</span>}
          </Link>
          <ThemeToggle compacto />
          <Link to="/professor/perfil" className="panel-avatar" aria-label="Abrir seu perfil">{iniciais}</Link>
        </div>
      </header>
      {!imersivo && <aside className="panel-sidebar" aria-label="Área do professor">
        <nav aria-label="Navegação do professor">
          <Link to="/professor" aria-current={secao === 'Painel' ? 'page' : undefined}><span className="panel-nav-icon" aria-hidden="true" />Painel</Link>
          <Link to="/professor/turmas" aria-current={secao === 'Turmas' ? 'page' : undefined}><span className="panel-nav-icon" aria-hidden="true" />Turmas</Link>
          <Link to="/professor/notificacoes" aria-current={secao === 'Notificações' ? 'page' : undefined}><span className="panel-nav-icon" aria-hidden="true" />Notificações</Link>
          <button type="button" aria-current={secao === 'Propostas' ? 'page' : undefined} onClick={() => setDialogo('propostas')} disabled={!pronto}><span className="panel-nav-icon" aria-hidden="true" />Propostas</button>
          <button type="button" onClick={onRedacoes ?? (() => navigate('/professor'))}><span className="panel-nav-icon" aria-hidden="true" />Redações</button>
          <Link to="/professor/perfil" aria-current={secao === 'Perfil' ? 'page' : undefined}><span className="panel-nav-icon" aria-hidden="true" />Perfil</Link>
        </nav>
        <Link to="/professor/perfil" className="panel-sidebar-profile">
          <span className="panel-avatar" aria-hidden="true">{iniciais}</span>
          <span><strong>{usuario?.nome ?? 'Professor'}</strong><small>Professor</small></span>
        </Link>
      </aside>}
      {children}
      <WorkspaceDialog tipo={dialogo} turmas={turmas} onClose={() => setDialogo(null)} />
    </div>
  )
}
