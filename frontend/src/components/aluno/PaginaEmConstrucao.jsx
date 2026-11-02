import AlunoLayout from '../../layouts/AlunoLayout.jsx'
import { useRotaEnviarRedacao } from '../../hooks/useRotaEnviarRedacao.js'

// Página mínima das telas do aluno que chegam nas próximas Issues da #43.
// Existe para a sidebar nunca apontar para uma rota sem página.
export default function PaginaEmConstrucao({
  titulo,
  descricao,
}) {
  const rotaEnviarRedacao = useRotaEnviarRedacao()

  return (
    <AlunoLayout
      rotaEnviarRedacao={rotaEnviarRedacao}
      trilha={[titulo]}
    >
      <header>
        <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50">
          {titulo}
        </h1>
        <p className="mt-[11px] text-base leading-[25px] text-lexis-200">
          {descricao}
        </p>
      </header>

      <section
        aria-labelledby="em-construcao-titulo"
        className="aluno-elevacao-1 mt-[25px] max-w-[720px] rounded-[14px] border border-[var(--surface-border)] bg-lexis-900 px-6 py-6"
      >
        <h2
          id="em-construcao-titulo"
          className="aluno-titulo-interface text-lg font-semibold leading-6 text-lexis-50"
        >
          Esta página está em construção
        </h2>
        <p className="mt-2 text-sm leading-[22px] text-lexis-200">
          O conteúdo chega em breve. Enquanto isso, o painel
          continua mostrando suas propostas e redações.
        </p>
      </section>
    </AlunoLayout>
  )
}
