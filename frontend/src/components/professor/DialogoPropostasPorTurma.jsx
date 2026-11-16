import { Link } from 'react-router'

import Botao from '../base/Botao.jsx'
import Dialogo from '../base/Dialogo.jsx'

// turmas tem padrão porque nem toda tela do professor carrega a lista.
export default function DialogoPropostasPorTurma({
  aberto,
  turmas = [],
  onFechar,
  retornoFocoRef,
}) {
  return (
    <Dialogo
      aberto={aberto}
      onFechar={onFechar}
      retornoFocoRef={retornoFocoRef}
      titulo="Propostas por turma"
      descricao="Escolha uma turma para consultar suas propostas e critérios."
      rodape={
        <Botao variante="secundario" onClick={onFechar}>
          Fechar
        </Botao>
      }
    >
      {turmas.length ? (
        <ul className="grid gap-2">
          {turmas.map((turma) => (
            <li key={turma.id}>
              <Link
                to={`/professor/turmas/${turma.id}`}
                className="block rounded-cartao bg-acao-suave p-3 text-acao-texto"
              >
                {turma.nome}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-texto-suave">
          Nenhuma turma disponível. Acesse Turmas para começar.
        </p>
      )}
    </Dialogo>
  )
}
