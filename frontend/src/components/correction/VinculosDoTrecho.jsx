import { useEffect, useRef } from 'react'
import { focarVinculo } from '../../hooks/useVinculoDeTrechos.js'
import './vinculos-do-trecho.css'

export default function VinculosDoTrecho({ vinculo }) {
  const titulo = useRef(null)
  const { origem, destinos, numero } = vinculo
  useEffect(() => { focarVinculo(titulo.current) }, [origem])

  return (
    <nav className="vinculos-trecho print:hidden" aria-label={`Comentários do trecho ${numero}`} data-vinculos-trecho>
      <p ref={titulo} tabIndex={-1}>Comentários do trecho {numero}</p>
      <ul>
        {destinos.map(({ id, nome }) => (
          <li key={id}>
            <a className="vinculo-trecho-acao" href={`#${id}`} onClick={(event) => {
              event.preventDefault()
              focarVinculo(document.getElementById(id))
            }}>{nome}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
