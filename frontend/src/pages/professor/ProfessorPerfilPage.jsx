import AppShell from '../../layouts/AppShell.jsx'
import EditorConta from '../../components/conta/EditorConta.jsx'

export default function ProfessorPerfilPage() {
  return (
    <AppShell conteudo="amplo" trilha={['Perfil']}>
      <div className="panel-main perfil-main">
        <h1>Perfil</h1>
        <p className="panel-subtitle">Seus dados de conta e a troca de senha.</p>
        <EditorConta />
      </div>
    </AppShell>
  )
}
