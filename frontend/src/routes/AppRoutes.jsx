import {
  lazy,
  Suspense,
} from 'react'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router'

import RouteGuard from './RouteGuard.jsx'
import RouteLoading from './RouteLoading.jsx'

const AlunoDashboardPage = lazy(() =>
  import('../pages/aluno/AlunoDashboardPage.jsx'),
)
const AlunoFeedbackPage = lazy(() =>
  import('../pages/aluno/AlunoFeedbackPage.jsx'),
)
const AlunoRedacaoPage = lazy(() =>
  import('../pages/aluno/AlunoRedacaoPage.jsx'),
)
const AlunoNotificacoesPage = lazy(() =>
  import('../pages/aluno/AlunoNotificacoesPage.jsx'),
)
const AlunoRedacoesPage = lazy(() =>
  import('../pages/aluno/AlunoRedacoesPage.jsx'),
)
const AlunoFeedbacksPage = lazy(() =>
  import('../pages/aluno/AlunoFeedbacksPage.jsx'),
)
const AlunoPerfilPage = lazy(() =>
  import('../pages/aluno/AlunoPerfilPage.jsx'),
)
const CadastroPage = lazy(() =>
  import('../pages/auth/CadastroPage.jsx'),
)
const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage.jsx'),
)
const RedefinirSenhaPage = lazy(() => import('../pages/auth/RedefinirSenhaPage.jsx'))
const ProfessorDashboardPage = lazy(() =>
  import('../pages/professor/ProfessorDashboardPage.jsx'),
)
const ProfessorTurmasPage = lazy(() =>
  import('../pages/professor/ProfessorTurmasPage.jsx'),
)
const ProfessorRedacaoPage = lazy(() =>
  import('../pages/professor/ProfessorRedacaoPage.jsx'),
)
const ProfessorNovoTemaPage = lazy(() =>
  import('../pages/professor/ProfessorNovoTemaPage.jsx'),
)
const ProfessorTemaPage = lazy(() =>
  import('../pages/professor/ProfessorTemaPage.jsx'),
)
const ProfessorTurmaPage = lazy(() =>
  import('../pages/professor/ProfessorTurmaPage.jsx'),
)

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        <Route
          element={
            <RouteGuard apenasVisitantes />
          }
        >
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route
            path="/cadastro"
            element={<CadastroPage />}
          />
        </Route>

        <Route
          element={
            <RouteGuard
              papeisPermitidos={['PROFESSOR']}
            />
          }
        >
          <Route
            path="/professor"
            element={<ProfessorDashboardPage />}
          />
          <Route
            path="/professor/turmas"
            element={
              <ProfessorTurmasPage />
            }
          />
          <Route
            path="/professor/turmas/:turmaId"
            element={
              <ProfessorTurmaPage />
            }
          />
          <Route
            path="/professor/turmas/:turmaId/temas/novo"
            element={<ProfessorNovoTemaPage />}
          />

          <Route
            path="/professor/temas/:temaId"
            element={<ProfessorTemaPage />}
          />

          <Route
            path="/professor/redacoes/:redacaoId"
            element={<ProfessorRedacaoPage />}
          />
        </Route>

        <Route
          element={
            <RouteGuard
              papeisPermitidos={['ALUNO']}
            />
          }
        >
          <Route
            path="/aluno"
            element={<AlunoDashboardPage />}
          />
          <Route
            path="/aluno/redacoes/:redacaoId/feedback"
            element={<AlunoFeedbackPage />}
          />
          <Route
            path="/aluno/notificacoes"
            element={<AlunoNotificacoesPage />}
          />
          <Route
            path="/aluno/redacoes"
            element={<AlunoRedacoesPage />}
          />
          <Route
            path="/aluno/feedbacks"
            element={<AlunoFeedbacksPage />}
          />
          <Route
            path="/aluno/perfil"
            element={<AlunoPerfilPage />}
          />
          <Route
            path="/aluno/temas/:temaId/redacao"
            element={<AlunoRedacaoPage />}
          />
        </Route>

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    </Suspense>
  )
}
