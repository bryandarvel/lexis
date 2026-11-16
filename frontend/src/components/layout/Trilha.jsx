import { Link } from 'react-router'

import { normalizarTrilha } from '../../utils/navegacao-casca.js'

/*
 * Trilha de contexto da barra da casca. Substitui as três implementações
 * anteriores (texto do aluno, rótulo de seção e trilhas próprias do
 * professor). Itens com `para` são links; o último é a página atual.
 */
export default function Trilha({ itens }) {
  const trilha = normalizarTrilha(itens)

  if (trilha.length === 0) return null

  return (
    <>
      <span aria-hidden="true" className="casca-divisor" />
      <nav aria-label="Trilha de navegação" className="casca-trilha">
        <ol>
          {trilha.map((item, indice) => (
            <li key={`${indice}-${item.rotulo}`}>
              {indice > 0 && <span aria-hidden="true">›</span>}
              {item.para ? (
                <Link to={item.para} title={item.rotulo}>
                  {item.rotulo}
                </Link>
              ) : (
                <span
                  className="casca-trilha-texto"
                  aria-current={item.atual ? 'page' : undefined}
                >
                  {item.rotulo}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
