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
const CadastroPage = lazy(() =>
  import('../pages/auth/CadastroPage.jsx'),
)
const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage.jsx'),
)
const ProfessorDashboardPage = lazy(() =>
  import('../pages/professor/ProfessorDashboardPage.jsx'),
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
            element={
              <Navigate
                to="/professor/turmas"
                replace
              />
            }
          />
          <Route
            path="/professor/turmas"
            element={
              <ProfessorDashboardPage />
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
