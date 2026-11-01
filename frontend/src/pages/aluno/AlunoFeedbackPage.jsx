import {
  useEffect,
  useId,
  useState,
} from 'react'
import {
  Link,
  useParams,
} from 'react-router'

import AlunoLayout from '../../layouts/AlunoLayout.jsx'
import { obterFeedbackAluno } from '../../services/feedbacks.js'
import { notificarContagemAtualizada } from '../../services/notification-events.js'
import {
  listarNotificacoes,
  marcarNotificacaoLida,
} from '../../services/notificacoes.js'
import {
  listarMinhasRedacoes,
  obterMinhaRedacao,
} from '../../services/redacoes.js'
import { listarTemasDoAluno } from '../../services/temas.js'
import {
  classificarCarregamentoFeedback,
  descreverFeedbackIndisponivel,
  descreverOrigemFeedback,
  descreverVersaoFeedback,
  listarNotasCompetencias,
  NOTA_MAXIMA_COMPETENCIA,
  NOTA_MAXIMA_TOTAL,
  obterRotaEnviarRedacao,
  organizarCriteriosComentados,
  possuiNotasCompetencias,
  selecionarNotificacoesNaoLidasDaRedacao,
} from '../../utils/aluno-feedback.js'
import { formatarDiaMes } from '../../utils/aluno-painel.js'
import './aluno-feedback.css'

const TRILHA = ['Início', 'Feedback']

const classeCartao =
  'rounded-xl border border-[var(--surface-border)] bg-lexis-900 aluno-elevacao-1'

const classeBotaoContorno =
  'inline-flex items-center justify-center rounded-lg border border-[var(--aluno-borda-campo)] bg-lexis-900 text-[13px] font-semibold leading-[18px] text-lexis-100 transition-colors hover:bg-[var(--aluno-neutro-fundo)]'

const classeSobretitulo =
  'text-[11px] font-bold uppercase leading-[14px] tracking-[1.32px]'

// Falhas aqui não aparecem para o aluno: o sino continua com a contagem
// anterior e a leitura pode ser feita depois na página de notificações.
async function marcarNotificacoesDaRedacaoComoLidas(redacaoId) {
  const { notificacoes, totalNaoLidas } =
    await listarNotificacoes()
  const ids = selecionarNotificacoesNaoLidasDaRedacao(
    notificacoes,
    redacaoId,
  )

  if (ids.length === 0) return

  const resultados = await Promise.allSettled(
    ids.map((id) => marcarNotificacaoLida(id)),
  )
  const marcadas = resultados.filter(
    (resultado) => resultado.status === 'fulfilled',
  ).length

  if (marcadas > 0) {
    notificarContagemAtualizada(
      Math.max(0, totalNaoLidas - marcadas),
    )
  }
}

function Cabecalho({ origem = [], acao = null }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.65px] text-lexis-50 sm:text-[36px] sm:leading-[41px]">
          Feedback da sua redação
        </h1>

        {origem.length > 0 && (
          <p className="mt-[19px] text-base leading-[25px] text-lexis-200">
            {origem.map((trecho, indice) => (
              <span key={`${indice}-${trecho}`}>
                {indice > 0 && (
                  <>
                    <span
                      aria-hidden="true"
                      className="mx-2"
                    >
                      ·
                    </span>
                    <span className="sr-only">, </span>
                  </>
                )}
                {trecho}
              </span>
            ))}
          </p>
        )}
      </div>

      {acao}
    </header>
  )
}

function BotaoImprimir() {
  const idDescricao = useId()

  return (
    <>
      <button
        type="button"
        aria-describedby={idDescricao}
        onClick={() => window.print()}
        className={`${classeBotaoContorno} h-11 w-40 shrink-0 sm:mt-1 print:hidden`}
      >
        Baixar em PDF
      </button>
      <span
        id={idDescricao}
        className="sr-only"
      >
        Abre a impressão do navegador. Escolha salvar como PDF.
      </span>
    </>
  )
}

function EsqueletoFeedback() {
  return (
    <div
      role="status"
      className="mt-[23px] animate-pulse motion-reduce:animate-none"
    >
      <span className="sr-only">
        Carregando a correção.
      </span>
      <div
        aria-hidden="true"
        className={`${classeCartao} h-[188px]`}
      />
      <div
        aria-hidden="true"
        className="mt-5 grid gap-6 xl:grid-cols-2"
      >
        <div className={`${classeCartao} h-[420px]`} />
        <div className={`${classeCartao} h-[420px]`} />
      </div>
    </div>
  )
}

function CartaoAviso({
  titulo,
  mensagem,
  tom = 'neutro',
  children,
}) {
  const classeTom =
    tom === 'erro'
      ? 'border-l-[var(--aluno-erro)]'
      : 'border-l-[var(--color-brand-accent)]'

  return (
    <section
      role={tom === 'erro' ? 'alert' : undefined}
      className={`${classeCartao} mt-[23px] max-w-[720px] border-l-[3px] px-6 py-5 ${classeTom}`}
    >
      <h2 className="aluno-titulo-interface text-lg font-semibold leading-6 text-lexis-50">
        {titulo}
      </h2>
      <p className="mt-2 text-sm leading-[22px] text-lexis-200">
        {mensagem}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {children}
      </div>
    </section>
  )
}

function AvisoCorrecaoAtualizada({ feedback }) {
  const publicadaEm = formatarDiaMes(feedback.publicadoEm)

  return (
    <p className="mt-[23px] rounded-lg border-l-[3px] border-l-[var(--color-brand-accent)] bg-[var(--aluno-acao-suave)] px-4 py-3 text-sm leading-[22px] text-lexis-100">
      <strong className="font-semibold text-[var(--aluno-acao-suave-texto)]">
        Correção atualizada.
      </strong>{' '}
      Esta correção foi revisada e publicada novamente
      {publicadaEm ? ` em ${publicadaEm}` : ''}. As notas e os
      comentários abaixo são os da versão atual.
    </p>
  )
}

function NotaGeral({ feedback }) {
  const competencias = listarNotasCompetencias(feedback)
  const versao = descreverVersaoFeedback(feedback)
  const possuiCompetencias =
    possuiNotasCompetencias(competencias)
  const notaTotal = Number.isInteger(feedback.nota)
    ? feedback.nota
    : null

  return (
    <section
      aria-labelledby="feedback-titulo-nota"
      className={`${classeCartao} feedback-impressao-inteiro mt-[23px] p-5 sm:px-[27px] sm:py-[23px]`}
    >
      <div className="flex flex-col gap-6 xl:flex-row xl:gap-0">
        <div className="flex shrink-0 flex-col xl:w-[193px] xl:border-r xl:border-[var(--surface-border)] xl:pr-6">
          <h2
            id="feedback-titulo-nota"
            className={`aluno-titulo-interface ${classeSobretitulo} text-lexis-200`}
          >
            Nota final
          </h2>
          <p className="mt-1.5 flex items-baseline gap-3">
            <span className="font-display text-[48px] font-bold leading-[53px] tracking-[-1.06px] text-lexis-50">
              {notaTotal ?? '—'}
            </span>
            <span className="text-xl font-semibold leading-[26px] tracking-[-0.16px] text-lexis-200">
              / {NOTA_MAXIMA_TOTAL}
            </span>
          </p>
          <p className="mt-3 text-xs font-medium leading-[17px] text-lexis-200 xl:mt-auto">
            {versao.rotulo}
          </p>
        </div>

        <div className="min-w-0 flex-1 border-t border-[var(--surface-border)] pt-6 xl:border-t-0 xl:pl-[27px] xl:pr-[5px] xl:pt-1.5">
          {possuiCompetencias ? (
            <ul
              aria-label="Notas por competência"
              className="grid gap-x-3 gap-y-6 sm:grid-cols-2 xl:grid-cols-5"
            >
              {competencias.map((competencia) => (
                <ItemCompetencia
                  key={competencia.campo}
                  competencia={competencia}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-[22px] text-lexis-200">
              Esta correção registrou apenas a nota total, sem as
              notas por competência.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function ItemCompetencia({ competencia }) {
  const {
    destaque,
    nota,
    numero,
    percentual,
    titulo,
  } = competencia

  return (
    <li className="min-w-0">
      <p
        className={`text-xs font-medium leading-[17px] ${
          destaque
            ? 'text-[var(--aluno-acao-suave-texto)]'
            : 'text-lexis-200'
        }`}
      >
        Competência {numero}
        {destaque && (
          <span className="sr-only">
            {' '}(detalhada abaixo)
          </span>
        )}
      </p>
      <p
        className={`mt-px text-xl font-semibold leading-[26px] tracking-[-0.16px] ${
          destaque
            ? 'text-[var(--feedback-destaque)]'
            : 'text-lexis-50'
        }`}
      >
        {nota === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">
              Sem nota registrada
            </span>
          </>
        ) : (
          <>
            {nota}
            <span className="sr-only">
              {' '}de {NOTA_MAXIMA_COMPETENCIA} pontos
            </span>
          </>
        )}
      </p>
      <div
        aria-hidden="true"
        className="feedback-trilho mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--aluno-trilho)]"
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${percentual}%`,
            background: destaque
              ? 'var(--feedback-destaque)'
              : 'var(--feedback-barra)',
          }}
        />
      </div>
      <p className="mt-2 text-xs font-medium leading-[17px] text-lexis-200">
        {titulo}
      </p>
    </li>
  )
}

function ComentarioGeral({ comentario }) {
  return (
    <section
      aria-labelledby="feedback-titulo-comentario"
      className={`${classeCartao} mt-5 overflow-hidden`}
    >
      <div className="border-l-[3px] border-l-[var(--color-brand-accent)] px-6 py-5">
        <h2
          id="feedback-titulo-comentario"
          className={`aluno-titulo-interface ${classeSobretitulo} text-[var(--aluno-acao-suave-texto)]`}
        >
          Comentário geral
        </h2>
        <p className="mt-3 max-w-[72ch] whitespace-pre-wrap break-words text-base leading-[26px] text-lexis-100">
          {comentario?.trim() ||
            'A correção foi publicada sem comentário geral.'}
        </p>
      </div>
    </section>
  )
}

function CompetenciaDois({ feedback }) {
  const criterios = organizarCriteriosComentados(
    feedback.criterios,
  )
  const nota = Number.isInteger(feedback.competencia2)
    ? feedback.competencia2
    : null

  return (
    <section
      aria-labelledby="feedback-titulo-competencia-2"
      className="overflow-hidden rounded-xl border-2 border-[var(--color-brand-accent)] bg-lexis-900"
    >
      <div className="flex items-start justify-between gap-4 bg-[var(--aluno-acao-suave)] px-[22px] pb-3 pt-[14px]">
        <div className="min-w-0">
          <p className={`${classeSobretitulo} text-[var(--aluno-acao-suave-texto)]`}>
            Competência II
          </p>
          <h2
            id="feedback-titulo-competencia-2"
            className="aluno-titulo-interface mt-1 text-xl font-semibold leading-[26px] tracking-[-0.16px] text-lexis-50"
          >
            Repertório sociocultural
          </h2>
        </div>
        <p className="mt-[14px] shrink-0 font-display text-2xl font-semibold leading-[30px] tracking-[-0.29px] text-[var(--feedback-destaque)]">
          {nota === null ? (
            <>
              <span aria-hidden="true">—</span>
              <span className="sr-only">
                Sem nota registrada
              </span>
            </>
          ) : (
            <>
              {nota} / {NOTA_MAXIMA_COMPETENCIA}
              <span className="sr-only"> pontos</span>
            </>
          )}
        </p>
      </div>

      <div className="px-[22px] pb-6 pt-4">
        <h3 className="aluno-titulo-interface text-[13px] font-semibold leading-[18px] text-lexis-50">
          Comentários por critério
        </h3>

        {criterios.length > 0 ? (
          <ul className="mt-2.5 space-y-2">
            {criterios.map((criterio) => (
              <li
                key={criterio.id}
                className={`feedback-tom-${criterio.tom} relative overflow-hidden rounded-lg bg-[var(--aluno-neutro-fundo)] py-3 pl-[18px] pr-[18px]`}
              >
                <span
                  aria-hidden="true"
                  className="feedback-faixa absolute inset-y-0 left-0 w-1 bg-[var(--feedback-tom)]"
                />
                <h4 className="flex items-center gap-2 text-[13px] font-semibold leading-[18px] text-[var(--feedback-tom)]">
                  <span
                    aria-hidden="true"
                    className="feedback-faixa size-2.5 shrink-0 rounded-full bg-[var(--feedback-tom)]"
                  />
                  {criterio.nome}
                </h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-5 text-lexis-100">
                  {criterio.comentario}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2.5 rounded-lg bg-[var(--aluno-neutro-fundo)] px-4 py-3 text-[13px] leading-5 text-lexis-200">
            Esta correção não tem comentários específicos por
            critério. O comentário geral traz o retorno sobre a
            sua redação.
          </p>
        )}
      </div>
    </section>
  )
}

function TextoRedacao({ redacao }) {
  const texto = redacao.texto?.trim()

  return (
    <section
      aria-labelledby="feedback-titulo-redacao"
      className={`${classeCartao} px-[23px] pb-7 pt-[19px]`}
    >
      <div className="feedback-cabecalho-cartao flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="feedback-titulo-redacao"
          className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50"
        >
          Sua redação
        </h2>
        <p className="text-xs font-medium leading-[17px] text-lexis-200">
          {redacao.origemTexto === 'OCR'
            ? 'Imagem digitalizada'
            : 'Texto digitado'}
        </p>
      </div>

      {texto ? (
        <div className="feedback-texto-redacao mt-2.5 whitespace-pre-wrap break-words font-display text-[17px] leading-8 text-lexis-100">
          {redacao.texto}
        </div>
      ) : (
        <p className="mt-2.5 text-sm leading-[22px] text-lexis-200">
          O texto desta redação não está disponível.
        </p>
      )}
    </section>
  )
}

export default function AlunoFeedbackPage() {
  const { redacaoId } = useParams()
  const [tentativa, setTentativa] = useState(0)
  const chave = `${redacaoId}:${tentativa}`
  const [carregamento, setCarregamento] = useState({
    chave: null,
    status: 'carregando',
  })
  const [rotaEnviarRedacao, setRotaEnviarRedacao] =
    useState(null)

  const estado =
    carregamento.chave === chave
      ? carregamento
      : { status: 'carregando' }

  useEffect(() => {
    let ativo = true

    Promise.allSettled([
      obterMinhaRedacao(redacaoId),
      obterFeedbackAluno(redacaoId),
    ]).then(([resultadoRedacao, resultadoFeedback]) => {
      if (!ativo) return

      setCarregamento({
        chave: `${redacaoId}:${tentativa}`,
        ...classificarCarregamentoFeedback(
          resultadoRedacao,
          resultadoFeedback,
        ),
      })
    })

    return () => {
      ativo = false
    }
  }, [redacaoId, tentativa])

  useEffect(() => {
    let ativo = true

    Promise.all([
      listarTemasDoAluno(),
      listarMinhasRedacoes(),
    ])
      .then(([temas, redacoes]) => {
        if (ativo) {
          setRotaEnviarRedacao(
            obterRotaEnviarRedacao(temas, redacoes),
          )
        }
      })
      .catch(() => {
        // Sem a lista de propostas, o item fica indisponível como no Painel.
      })

    return () => {
      ativo = false
    }
  }, [])

  const correcaoCarregada = estado.status === 'pronto'

  useEffect(() => {
    if (!correcaoCarregada) return

    marcarNotificacoesDaRedacaoComoLidas(redacaoId).catch(
      () => {},
    )
  }, [correcaoCarregada, redacaoId])

  let conteudo

  if (estado.status === 'carregando') {
    conteudo = (
      <>
        <Cabecalho />
        <EsqueletoFeedback />
      </>
    )
  } else if (estado.status === 'pronto') {
    const { feedback, redacao } = estado

    conteudo = (
      <>
        <Cabecalho
          origem={descreverOrigemFeedback({
            redacao,
            feedback,
          })}
          acao={<BotaoImprimir />}
        />

        {descreverVersaoFeedback(feedback).atualizada && (
          <AvisoCorrecaoAtualizada feedback={feedback} />
        )}

        <NotaGeral feedback={feedback} />

        <ComentarioGeral
          comentario={feedback.comentarioGeral}
        />

        <div className="feedback-impressao-grade mt-5 grid items-start gap-6 xl:grid-cols-2">
          <CompetenciaDois feedback={feedback} />
          <TextoRedacao redacao={redacao} />
        </div>
      </>
    )
  } else if (estado.status === 'nao-publicada') {
    const indisponivel = descreverFeedbackIndisponivel(
      estado.redacao,
    )

    conteudo = (
      <>
        <Cabecalho
          origem={descreverOrigemFeedback({
            redacao: estado.redacao,
          })}
        />
        <CartaoAviso
          titulo={indisponivel.titulo}
          mensagem={indisponivel.mensagem}
        >
          <Link
            to={indisponivel.acao.destino}
            className={`${classeBotaoContorno} h-10 px-4`}
          >
            {indisponivel.acao.rotulo}
          </Link>
        </CartaoAviso>
      </>
    )
  } else {
    const naoEncontrada =
      estado.status === 'nao-encontrada'

    conteudo = (
      <>
        <Cabecalho />
        <CartaoAviso
          tom="erro"
          titulo={
            naoEncontrada
              ? 'Redação não encontrada'
              : 'Não foi possível carregar a correção'
          }
          mensagem={
            naoEncontrada
              ? 'Esta redação não existe ou não pertence à sua conta. Confira o link ou volte ao início.'
              : 'Verifique sua conexão e tente novamente em instantes.'
          }
        >
          {!naoEncontrada && (
            <button
              type="button"
              onClick={() =>
                setTentativa((atual) => atual + 1)
              }
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-brand-accent)] px-4 text-[13px] font-semibold leading-[18px] text-white transition hover:brightness-110"
            >
              Tentar novamente
            </button>
          )}
          <Link
            to="/aluno"
            className={`${classeBotaoContorno} h-10 px-4`}
          >
            Voltar ao início
          </Link>
        </CartaoAviso>
      </>
    )
  }

  return (
    <AlunoLayout
      rotaEnviarRedacao={rotaEnviarRedacao}
      trilha={TRILHA}
    >
      <div className="aluno-feedback">
        {conteudo}
      </div>
    </AlunoLayout>
  )
}
