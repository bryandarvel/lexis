import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router'

import { useAuth } from '../hooks/useAuth.js'
import RouteLoading from './RouteLoading.jsx'

function obterRotaInicial(papel) {
  if (papel === 'PROFESSOR') {
    return '/professor/turmas'
  }

  if (papel === 'ALUNO') {
    return '/aluno'
  }

  return null
}

export default function RouteGuard({
  apenasVisitantes = false,
  papeisPermitidos = [],
}) {
  const {
    usuario,
    autenticado,
    carregando,
  } = useAuth()

  const location = useLocation()

  if (carregando) {
    return <RouteLoading />
  }

  if (apenasVisitantes) {
    const rotaInicial = obterRotaInicial(
      usuario?.papel,
    )

    if (autenticado && rotaInicial) {
      return (
        <Navigate
          to={rotaInicial}
          replace
        />
      )
    }

    return <Outlet />
  }

  if (!autenticado) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          origem: location.pathname,
        }}
      />
    )
  }

  const papelPermitido =
    papeisPermitidos.length === 0 ||
    papeisPermitidos.includes(usuario.papel)

  if (!papelPermitido) {
    const rotaInicial = obterRotaInicial(
      usuario.papel,
    )

    return (
      <Navigate
        to={rotaInicial ?? '/login'}
        replace
      />
    )
  }

  return <Outlet />
}
