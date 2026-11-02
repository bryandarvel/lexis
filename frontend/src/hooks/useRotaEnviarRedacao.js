import { useEffect, useState } from 'react'

import { listarMinhasRedacoes } from '../services/redacoes.js'
import { listarTemasDoAluno } from '../services/temas.js'
import { selecionarPropostaAberta } from '../utils/aluno-painel.js'

// O item "Enviar redação" da sidebar aponta para a proposta aberta mais
// próxima do prazo. As páginas do aluno que não carregam essa lista por conta
// própria usam este hook; sem proposta, ou se a consulta falhar, o item fica
// indisponível, como no Painel.
export function useRotaEnviarRedacao() {
  const [rota, setRota] = useState(null)

  useEffect(() => {
    let ativo = true

    Promise.all([
      listarTemasDoAluno(),
      listarMinhasRedacoes(),
    ])
      .then(([temas, redacoes]) => {
        if (!ativo) return

        const proposta = selecionarPropostaAberta(
          temas,
          redacoes,
        )

        setRota(
          proposta
            ? `/aluno/temas/${encodeURIComponent(proposta.id)}/redacao`
            : null,
        )
      })
      .catch(() => {
        // Sem a lista, o item da sidebar fica indisponível.
      })

    return () => {
      ativo = false
    }
  }, [])

  return rota
}
