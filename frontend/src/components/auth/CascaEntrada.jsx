import { useId } from 'react'
import {
  Link,
  useLocation,
} from 'react-router'

import logo from '../../assets/lexis-logo-login.svg'
import {
  ABAS_ENTRADA,
  indiceDaAba,
  pontoDePartida,
} from '../../utils/alternancia-entrada.js'
import ThemeToggle from '../layout/ThemeToggle.jsx'
import './casca-entrada.css'

/*
 * Casca das telas de entrada (UX-002): login, cadastro e redefinição de senha
 * usam o mesmo painel de marca, o mesmo cartão e o mesmo título. `aba` mostra
 * a alternância "Entrar / Criar conta" com a aba atual marcada; sem ela, a
 * alternância não aparece (redefinição de senha).
 *
 * A pílula do seletor desliza de uma aba à outra. Como as duas abas são rotas
 * distintas, a casca remonta a cada troca: o link leva no estado da navegação
 * de qual aba partiu e a pílula é desenhada já na aba atual, com uma animação
 * que vem da aba anterior. Nascer no lugar certo é o que garante que, sem
 * animação — `prefers-reduced-motion`, aba em segundo plano —, a aba marcada
 * continue sendo a verdadeira.
 */
export default function CascaEntrada({
  titulo,
  descricao,
  aba = null,
  children,
}) {
  const idTitulo = useId()
  const { state } = useLocation()
  const destino = indiceDaAba(aba)
  const partida = pontoDePartida(state?.abaAnterior, aba)

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
            <nav
              className="login-tabs"
              aria-label="Acesso à conta"
              style={{
                '--aba-visivel': destino,
                '--aba-partida': partida,
              }}
            >
              <span
                aria-hidden="true"
                data-deslizar={partida !== destino || undefined}
                className="login-tabs__pilula"
              />
              {ABAS_ENTRADA.map(({ chave, rotulo, rota }) =>
                chave === aba ? (
                  <span
                    key={chave}
                    aria-current="page"
                    className="login-tabs__aba"
                  >
                    {rotulo}
                  </span>
                ) : (
                  <Link
                    key={chave}
                    to={rota}
                    state={{ abaAnterior: aba }}
                    className="login-tabs__aba"
                  >
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
