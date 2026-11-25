import { Link, Navigate } from 'react-router'

import Botao from '../components/base/Botao.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useRotaEnviarRedacao } from '../hooks/useRotaEnviarRedacao.js'
import AppShell from '../layouts/AppShell.jsx'
import RouteLoading from '../routes/RouteLoading.jsx'
import { rotaInicialDoPapel } from '../utils/navegacao-casca.js'

const TRILHA = ['Página não encontrada']

function Mensagem({ papel }) {
  return (
    <>
      <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-texto">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-prose text-base leading-[25px] text-texto-suave">
        Este endereço não existe no LÉXIS. O link pode estar incompleto ou a
        página pode ter mudado de lugar.
      </p>
      <Botao as={Link} to={rotaInicialDoPapel(papel)} className="mt-6">
        {papel === 'PROFESSOR' ? 'Ir para o painel' : 'Ir para o início'}
      </Botao>
    </>
  )
}

// O atalho "Enviar redação" do menu depende de uma consulta que só existe para o aluno.
function NaoEncontradoAluno() {
  const rotaEnviarRedacao = useRotaEnviarRedacao()

  return (
    <AppShell trilha={TRILHA} rotaEnviarRedacao={rotaEnviarRedacao}>
      <Mensagem papel="ALUNO" />
    </AppShell>
  )
}

/*
 * Rota desconhecida (UX-030). Com sessão ativa, a pessoa continua dentro da
 * casca e recebe um caminho de volta para o início do seu papel. Sem sessão,
 * o destino continua sendo o login, como antes.
 */
export default function NaoEncontradoPage() {
  const { usuario, autenticado, carregando } = useAuth()

  if (carregando) return <RouteLoading />

  if (!autenticado) return <Navigate to="/login" replace />

  if (usuario?.papel === 'PROFESSOR') {
    return (
      <AppShell trilha={TRILHA}>
        <Mensagem papel="PROFESSOR" />
      </AppShell>
    )
  }

  return <NaoEncontradoAluno />
}
