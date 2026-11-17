import { useId } from 'react'
import { Link } from 'react-router'

import logo from '../../assets/lexis-logo-login.svg'
import ThemeToggle from '../layout/ThemeToggle.jsx'
import './casca-entrada.css'

const ABAS = [
  ['entrar', 'Entrar', '/login'],
  ['cadastro', 'Criar conta', '/cadastro'],
]

/*
 * Casca das telas de entrada (UX-002): login, cadastro e redefinição de senha
 * usam o mesmo painel de marca, o mesmo cartão e o mesmo título. `aba` mostra
 * a alternância "Entrar / Criar conta" com a aba atual marcada; sem ela, a
 * alternância não aparece (redefinição de senha).
 */
export default function CascaEntrada({
  titulo,
  descricao,
  aba = null,
  children,
}) {
  const idTitulo = useId()

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="LÉXIS">
        <img src={logo} alt="LÉXIS" className="login-logo" />
      </section>
      <section className="login-access" aria-labelledby={idTitulo}>
        <div className="login-theme">
          <ThemeToggle compacto />
        </div>
        <div
          className="login-card"
        >
          <h1 id={idTitulo}>{titulo}</h1>
          {descricao && (
            <p className="login-description">{descricao}</p>
          )}
          {aba && (
            <nav className="login-tabs" aria-label="Acesso à conta">
              {ABAS.map(([chave, rotulo, rota]) =>
                chave === aba ? (
                  <span key={chave} aria-current="page">
                    {rotulo}
                  </span>
                ) : (
                  <Link key={chave} to={rota}>
                    {rotulo}
                  </Link>
                ),
              )}
            </nav>
          )}
          {children}
        </div>
      </section>
    </main>
  )
}
