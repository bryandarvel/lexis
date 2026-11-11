import { useEffect, useState } from 'react'

import { useAuth } from './useAuth.js'
import { listarMinhasRedacoes } from '../services/redacoes.js'
import { listarTemasDoAluno } from '../services/temas.js'
import { obterRotaEnviarRedacao } from '../utils/aluno-feedback.js'
import {
  estadoDaContaAtual,
  marcarConta,
} from '../utils/identidade-sessao.js'

const INICIAL = { rota: null, usuarioId: null }

// O item "Enviar redação" da sidebar usa a mesma regra do Painel
// (obterRotaEnviarRedacao): a primeira proposta que ainda aceita envio, com as
// futuras na frente e a vencida pendente como alternativa, porque a entrega
// com atraso continua permitida. Arquivada e já enviada ficam de fora. As
// páginas do aluno que não carregam essa lista por conta própria usam este
// hook; sem proposta, ou se a consulta falhar, o item fica indisponível.
//
// A rota pertence à conta que a carregou. Depois de uma reautenticação como
// outra pessoa, o atalho não pode continuar apontando para a proposta da conta
// anterior: o estado some do render na hora e uma nova consulta começa.
// Reautenticar na mesma conta não muda o id, então nada é recarregado.
export function useRotaEnviarRedacao() {
  const { usuario } = useAuth()
  const usuarioId = usuario?.id
  const [estado, setEstado] = useState(INICIAL)

  useEffect(() => {
    if (!usuarioId) {
      return undefined
    }

    let ativo = true

    Promise.all([
      listarTemasDoAluno(),
      listarMinhasRedacoes(),
    ])
      .then(([temas, redacoes]) => {
        // A consulta foi pedida por esta conta. Se outra entrou enquanto ela
        // corria, a limpeza do efeito já passou e a resposta é descartada.
        if (!ativo) return

        setEstado(
          marcarConta(
            { rota: obterRotaEnviarRedacao(temas, redacoes) },
            usuarioId,
          ),
        )
      })
      .catch(() => {
        // Sem a lista, o item da sidebar fica indisponível.
      })

    return () => {
      ativo = false
    }
  }, [usuarioId])

  // Segunda barreira, no render: o que não é da conta atual nunca aparece,
  // mesmo que uma resposta antiga tenha chegado a gravar o estado.
  return estadoDaContaAtual(estado, usuarioId, INICIAL).rota
}
