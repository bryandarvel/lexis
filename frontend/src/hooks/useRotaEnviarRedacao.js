import { useEffect, useState } from 'react'

import { listarMinhasRedacoes } from '../services/redacoes.js'
import { listarTemasDoAluno } from '../services/temas.js'
import { obterRotaEnviarRedacao } from '../utils/aluno-feedback.js'

// O item "Enviar redação" da sidebar usa a mesma regra do Painel
// (obterRotaEnviarRedacao): a primeira proposta que ainda aceita envio, com as
// futuras na frente e a vencida pendente como alternativa, porque a entrega
// com atraso continua permitida. Arquivada e já enviada ficam de fora. As
// páginas do aluno que não carregam essa lista por conta própria usam este
// hook; sem proposta, ou se a consulta falhar, o item fica indisponível.
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

        setRota(obterRotaEnviarRedacao(temas, redacoes))
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
