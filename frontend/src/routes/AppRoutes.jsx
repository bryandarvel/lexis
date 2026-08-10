import {
  Navigate,
  Route,
  Routes,
} from 'react-router'

import AlunoDashboardPage from '../pages/aluno/AlunoDashboardPage.jsx'
import AlunoFeedbackPage from '../pages/aluno/AlunoFeedbackPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import ProfessorDashboardPage from '../pages/professor/ProfessorDashboardPage.jsx'
import ProfessorRedacaoPage from '../pages/professor/ProfessorRedacaoPage.jsx'
import ProfessorTemaPage from '../pages/professor/ProfessorTemaPage.jsx'
import ProfessorTurmaPage from '../pages/professor/ProfessorTurmaPage.jsx'
import RouteGuard from './RouteGuard.jsx'

export default function AppRoutes() {
  return (
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
  )
}
