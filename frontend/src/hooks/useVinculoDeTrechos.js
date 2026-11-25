import { useState } from 'react'

export function focarVinculo(alvo) {
  alvo?.scrollIntoView({ block: 'nearest' })
  alvo?.focus({ preventScroll: true })
}

export function useVinculoDeTrechos() {
  const [vinculo, setVinculo] = useState(null)

  function selecionar({ origem, chaves, criterios, destinos = [], numero }, alvo) {
    if (vinculo?.origem === origem) {
      setVinculo(null)
      return
    }
    setVinculo({ origem, chaves, criterios, destinos, numero })
    if (alvo) focarVinculo(document.getElementById(alvo))
  }

  return {
    vinculo,
    selecionar,
    limpar: () => setVinculo(null),
    aoPressionarTecla(event) {
      if (event.key !== 'Escape' || event.defaultPrevented || !vinculo) return
      event.preventDefault()
      if (event.target.closest('[data-vinculos-trecho]')) {
        focarVinculo(document.getElementById(vinculo.origem))
      }
      setVinculo(null)
    },
  }
}
