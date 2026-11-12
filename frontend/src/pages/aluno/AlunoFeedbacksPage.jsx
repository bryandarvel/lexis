import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'

import AlunoLayout from '../../layouts/AlunoLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { listarMinhasRedacoes } from '../../services/redacoes.js'
import { obterDesempenhoAluno } from '../../services/desempenho.js'
import { listarTemasDoAluno } from '../../services/temas.js'
import { obterRotaEnviarRedacao } from '../../utils/aluno-feedback.js'
import {
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
} from '../../utils/identidade-sessao.js'
import {
  ORDENACOES_FEEDBACK,
  caminhoDoFeedback,
  descreverQuantidade,
  formatarPublicacao,
  obterProfessorDoFeedback,
  ordenarFeedbacks,
  resumirFeedbacks,
  selecionarFeedbacks,
} from '../../utils/aluno-feedbacks.js'
import { formatarIndicador } from '../../utils/aluno-painel.js'
import './aluno-feedbacks.css'

function ItemFeedback({ redacao }) {
  const tema = redacao.tema?.enunciado ?? 'Proposta de redação'
  const turma = redacao.tema?.turma?.nome
  const publicacao = formatarPublicacao(redacao)
  const professor = obterProfessorDoFeedback(redacao)

  return (
    <li className="aluno-fb-item">
      <div className="aluno-fb-info">
        {publicacao && <p className="aluno-fb-data">{publicacao}</p>}
        <h2 className="aluno-fb-titulo">{tema}</h2>
        {turma && <p className="aluno-fb-turma">{turma}</p>}
        {professor && (
          <p className="aluno-fb-turma aluno-fb-professor">
            Professor: {professor}
          </p>
        )}
      </div>

      <div className="aluno-fb-lado">
        <p className="aluno-fb-nota">
          <span className="aluno-fb-nota-valor">
            {redacao.notaPublicada}
          </span>
          <span aria-hidden="true"> / 1000</span>
          <span className="sr-only"> de 1000 pontos</span>
        </p>

        <Link
          to={caminhoDoFeedback(redacao)}
          className="aluno-fb-botao"
          aria-label={`Ver feedback: ${tema}`}
        >
          Ver feedback
        </Link>
      </div>
    </li>
  )
}

const CARREGANDO = {
  status: 'carregando',
  feedbacks: [],
  rotaEnviar: null,
  desempenho: null,
  usuarioId: null,
}

export default function AlunoFeedbacksPage() {
  const idOrdem = useId()
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? null
  const [carregamento, setCarregamento] = useState(CARREGANDO)
  const [tentativa, setTentativa] = useState(0)
  const [ordenacao, setOrdenacao] = useState('recentes')

  useEffect(() => {
    let ativo = true
    // A conta desta consulta. Uma resposta que chegue depois de outra pessoa
    // entrar é descartada, em vez de preencher a tela dela.
    const contaDaConsulta = usuarioId

    setCarregamento(marcarConta(CARREGANDO, contaDaConsulta))

    if (!contaDaConsulta) return undefined

    // A lista é o que a página existe para mostrar; as propostas só definem o
    // item "Enviar redação" da sidebar, então a falha delas não derruba a tela.
    // O desempenho só dá o resumo; se falhar, o resumo usa a mesma regra sobre a lista.
    Promise.allSettled([
      listarMinhasRedacoes(),
      listarTemasDoAluno(),
      obterDesempenhoAluno(),
    ]).then(([listaResultado, temasResultado, desempenhoResultado]) => {
      if (!ativo) return

      if (listaResultado.status === 'rejected') {
        setCarregamento(
          marcarConta({ ...CARREGANDO, status: 'erro' }, contaDaConsulta),
        )
        return
      }

      const redacoes = Array.isArray(listaResultado.value)
        ? listaResultado.value
        : []

      setCarregamento((atual) =>
        // Descarta a resposta se a conta mudou entre o pedido e a chegada.
        mesmaConta(atual.usuarioId, contaDaConsulta)
          ? marcarConta(
              {
                status: 'pronto',
                feedbacks: selecionarFeedbacks(redacoes),
                desempenho:
                  desempenhoResultado.status === 'fulfilled'
                    ? desempenhoResultado.value
                    : null,
                // Mesma regra do painel, sem repetir a seleção do atalho.
                rotaEnviar:
                  temasResultado.status === 'fulfilled'
                    ? obterRotaEnviarRedacao(temasResultado.value, redacoes)
                    : null,
              },
              contaDaConsulta,
            )
          : atual,
      )
    })

    return () => {
      ativo = false
    }
  }, [tentativa, usuarioId])

  // O render nunca usa estado de outra conta: na troca, volta ao carregando.
  const { status, feedbacks, rotaEnviar, desempenho } = estadoDaContaAtual(
    carregamento,
    usuarioId,
    CARREGANDO,
  )
  const resumo = resumirFeedbacks(feedbacks, desempenho)
  const visiveis = ordenarFeedbacks(feedbacks, ordenacao)

  return (
    <AlunoLayout rotaEnviarRedacao={rotaEnviar} trilha={['Feedbacks']}>
      <header>
        <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50">
          Feedbacks
        </h1>
        <p className="mt-[11px] text-base leading-[25px] text-lexis-200">
          Veja as correções que seus professores já publicaram.
        </p>
      </header>

      {status === 'carregando' && (
        <div
          role="status"
          aria-label="Carregando seus feedbacks"
          className="mt-[25px]"
        >
          <ul className="aluno-fb-lista" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <li key={item} className="aluno-fb-item aluno-fb-esqueleto" />
            ))}
          </ul>
        </div>
      )}

      {status === 'erro' && (
        <section
          role="alert"
          className="aluno-elevacao-1 mt-[25px] max-w-[720px] rounded-[14px] border border-[var(--surface-border)] border-l-[3px] border-l-[var(--aluno-erro)] bg-lexis-900 px-6 py-5"
        >
          <h2 className="aluno-titulo-interface text-lg font-semibold leading-6 text-lexis-50">
            Não foi possível carregar seus feedbacks
          </h2>
          <p className="mt-2 text-sm leading-[22px] text-lexis-200">
            Verifique sua conexão e tente novamente em instantes.
          </p>
          <button
            type="button"
            onClick={() => setTentativa((valor) => valor + 1)}
            className="aluno-fb-botao aluno-fb-botao-primario mt-4"
          >
            Tentar novamente
          </button>
        </section>
      )}

      {status === 'pronto' && feedbacks.length === 0 && (
        <section className="aluno-elevacao-1 mt-[25px] max-w-[720px] rounded-[14px] border border-[var(--surface-border)] bg-lexis-900 px-6 py-6">
          <h2 className="aluno-titulo-interface text-lg font-semibold leading-6 text-lexis-50">
            Você ainda não recebeu nenhum feedback
          </h2>
          <p className="mt-2 text-sm leading-[22px] text-lexis-200">
            O feedback aparece aqui depois que o professor corrige e
            publica a nota da sua redação. Acompanhe o andamento de
            cada texto em Minhas redações.
          </p>
          <Link to="/aluno/redacoes" className="aluno-fb-botao mt-4">
            Ir para Minhas redações
          </Link>
        </section>
      )}

      {status === 'pronto' && feedbacks.length > 0 && (
        <>
          <dl className="aluno-fb-resumo" aria-label="Resumo dos feedbacks">
            <div>
              <dt>Feedbacks publicados</dt>
              <dd>{resumo.quantidade}</dd>
            </div>
            <div>
              <dt>Média das notas publicadas</dt>
              <dd>{formatarIndicador(resumo.media)}</dd>
            </div>
          </dl>

          <div className="aluno-fb-controle">
            <label htmlFor={idOrdem}>Ordenar por</label>
            <select
              id={idOrdem}
              value={ordenacao}
              onChange={(evento) => setOrdenacao(evento.target.value)}
            >
              {ORDENACOES_FEEDBACK.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>

          <p role="status" className="aluno-fb-contagem">
            {descreverQuantidade(visiveis.length)}
          </p>

          <ul className="aluno-fb-lista">
            {visiveis.map((redacao) => (
              <ItemFeedback key={redacao.id} redacao={redacao} />
            ))}
          </ul>
        </>
      )}
    </AlunoLayout>
  )
}
