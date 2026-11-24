import { IconeEditorial } from '../../components/base/icones.jsx'
import { formatarData } from '../../utils/formatar-data.js'
import Botao from '../../components/base/Botao.jsx'
import { IconeBaixar } from '../../components/base/icones.jsx'
import {
  useEffect,
  useId,
  useState,
} from 'react'
import {
  Link,
  useParams,
} from 'react-router'

import AppShell from '../../layouts/AppShell.jsx'
import VinculosDoTrecho from '../../components/correction/VinculosDoTrecho.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useVinculoDeTrechos } from '../../hooks/useVinculoDeTrechos.js'
import { obterTomDaMarca } from '../../utils/criterio-cores.js'
import { chaveTrecho } from '../../utils/trechos-feedback.js'
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
  montarTextoComTrechos,
  NOTA_MAXIMA_COMPETENCIA,
  NOTA_MAXIMA_TOTAL,
  obterRotaEnviarRedacao,
  organizarCriteriosComentados,
  possuiNotasCompetencias,
  selecionarNotificacoesNaoLidasDaRedacao,
} from '../../utils/aluno-feedback.js'
import './aluno-feedback.css'

const TRILHA = ['Início', 'Feedback']

const classeCartao =
  'rounded-cartao border border-[var(--surface-border)] bg-superficie aluno-elevacao-1'

const classeSobretitulo =
  'text-xs font-semibold leading-5'

// Falhas aqui não aparecem para o aluno: o sino continua com a contagem
// anterior e a leitura pode ser feita depois na página de notificações.
async function marcarNotificacoesDaRedacaoComoLidas(redacaoId, estaAtivo) {
  const { notificacoes, totalNaoLidas } =
    await listarNotificacoes()
  if (!estaAtivo()) return
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

  if (marcadas > 0 && estaAtivo()) {
    notificarContagemAtualizada(
      Math.max(0, totalNaoLidas - marcadas),
    )
  }
}

function Cabecalho({ origem = [], acao = null }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.65px] text-texto sm:text-[36px] sm:leading-[41px]">
          Feedback da sua redação
        </h1>

        {origem.length > 0 && (
          <p className="mt-[19px] text-base leading-[25px] text-texto-suave">
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

/*
 * Issue #180. O botão chamava "Baixar em PDF", mas não baixa arquivo: abre a
 * impressão do navegador, e é lá que se escolhe salvar como PDF. O rótulo agora
 * usa o nome da própria opção do diálogo ("Salvar como PDF") e a linha logo
 * abaixo diz o que acontece, visível para todos — antes só um leitor de tela
 * recebia essa explicação. É a ação principal da tela, então é preenchido.
 */
function BotaoImprimir() {
  const idDescricao = useId()

  return (
    <div className="flex shrink-0 flex-col gap-1.5 sm:mt-1 sm:items-end print:hidden">
      <Botao
        type="button"
        aria-describedby={idDescricao}
        onClick={() => window.print()}
        className="w-full sm:w-auto">
        <IconeBaixar />
        Salvar como PDF
      </Botao>
      <span
        id={idDescricao}
        className="text-xs leading-[17px] text-texto-suave"
      >
        Abre a impressão do navegador.
      </span>
    </div>
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
      <h2 className="text-lg font-semibold leading-6 text-texto">
        {titulo}
      </h2>
      <p className="mt-2 text-sm leading-[22px] text-texto-suave">
        {mensagem}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {children}
      </div>
    </section>
  )
}

function AvisoCorrecaoAtualizada({ feedback }) {
  const publicadaEm = formatarData(feedback.publicadoEm, 'data')

  return (
    <p className="mt-[23px] rounded-controle border-l-[3px] border-l-[var(--color-brand-accent)] bg-[var(--aluno-acao-suave)] px-4 py-3 text-sm leading-[22px] text-texto">
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
            className={`${classeSobretitulo} text-texto-suave`}
          >
            Nota final
          </h2>
          <p className="mt-1.5 flex items-baseline gap-3">
            <span className="fonte-nota text-[48px] font-bold leading-[53px] tracking-[-1.06px] text-texto">
              {notaTotal ?? '—'}
            </span>
            <span className="text-xl font-semibold leading-[26px] tracking-[-0.16px] text-texto-suave">
              / {NOTA_MAXIMA_TOTAL}
            </span>
          </p>
          <p className="mt-3 text-xs font-medium leading-[17px] text-texto-suave xl:mt-auto">
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
            <p className="text-sm leading-[22px] text-texto-suave">
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
            : 'text-texto-suave'
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
            : 'text-texto'
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
      <p className="mt-2 text-xs font-medium leading-[17px] text-texto-suave">
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
          className={`${classeSobretitulo} text-[var(--aluno-acao-suave-texto)]`}
        >
          <IconeEditorial tipo="comentario" />Comentário geral
        </h2>
        <p className="mt-3 max-w-[72ch] whitespace-pre-wrap break-words text-base leading-[26px] text-texto">
          {comentario?.trim() ||
            'A correção foi publicada sem comentário geral.'}
        </p>
      </div>
    </section>
  )
}

function CompetenciaDois({ feedback, marcacoes, vinculo, selecionar }) {
  const criterios = organizarCriteriosComentados(
    feedback.criterios,
  )
  const nota = Number.isInteger(feedback.competencia2)
    ? feedback.competencia2
    : null

  return (
    <section
      aria-labelledby="feedback-titulo-competencia-2"
      className="overflow-hidden rounded-cartao border-2 border-[var(--color-brand-accent)] bg-superficie"
    >
      <div className="flex items-start justify-between gap-4 bg-[var(--aluno-acao-suave)] px-[22px] pb-3 pt-[14px]">
        <div className="min-w-0">
          <p className={`${classeSobretitulo} text-[var(--aluno-acao-suave-texto)]`}>
            Competência II
          </p>
          <h2
            id="feedback-titulo-competencia-2"
            className="mt-1 text-xl font-semibold leading-[26px] tracking-[-0.16px] text-texto"
          >
            Repertório sociocultural
          </h2>
        </div>
        <p className="mt-[14px] shrink-0 fonte-nota text-2xl font-semibold leading-[30px] tracking-[-0.29px] text-[var(--feedback-destaque)]">
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
        <h3 className="text-[13px] font-semibold leading-[18px] text-texto">
          Comentários por critério
        </h3>

        {criterios.length > 0 ? (
          <ul className="mt-2.5 space-y-2">
            {criterios.map((criterio) => {
              const trechos = marcacoes.filter((marca) => marca.ordens.includes(criterio.ordem))
              const destino = `feedback-comentario-${criterio.ordem}`
              const seletor = `feedback-destacar-${criterio.ordem}`
              return (
              <li
                key={criterio.id}
                id={destino}
                tabIndex={-1}
                aria-labelledby={`${destino}-nome`}
                className={`feedback-tom-${criterio.tom} relative overflow-hidden rounded-controle bg-[var(--aluno-neutro-fundo)] py-3 pl-[18px] pr-[18px]${vinculo?.criterios.includes(criterio.ordem) ? ' comentario-em-foco' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className="feedback-faixa absolute inset-y-0 left-0 w-1 bg-[var(--feedback-tom)]"
                />
                <h4 id={`${destino}-nome`} className="flex items-center gap-2 text-[13px] font-semibold leading-[18px] text-[var(--feedback-tom)]">
                  <span
                    aria-hidden="true"
                    className="feedback-faixa size-2.5 shrink-0 rounded-full bg-[var(--feedback-tom)]"
                  />
                  {criterio.nome}
                </h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-5 text-texto">
                  {criterio.comentario}
                </p>
                {trechos.length > 0 && <>
                  <div className="feedback-atalhos-trechos">
                    {trechos.length > 1 && <button id={seletor} type="button" className="vinculo-trecho-acao"
                      aria-label={`Destacar trechos de ${criterio.nome}`} aria-pressed={vinculo?.origem === seletor}
                      onClick={() => selecionar({ origem: seletor, chaves: trechos.map(chaveTrecho), criterios: [criterio.ordem] },
                        `feedback-marca-${chaveTrecho(trechos[0])}`)}>Destacar trechos</button>}
                    {trechos.map((marca) => {
                      const chave = chaveTrecho(marca)
                      const alvo = `feedback-marca-${chave}`
                      const id = `${seletor}-${chave}`
                      return <a id={id} key={chave} className="vinculo-trecho-acao" href={`#${alvo}`} onClick={(event) => {
                        event.preventDefault()
                        selecionar({ origem: id, chaves: [chave], criterios: [criterio.ordem] }, alvo)
                      }}>Trecho {marca.numero}</a>
                    })}
                  </div>
                  <p className="feedback-so-impressao">
                    {trechos.length === 1 ? 'Trecho: ' : 'Trechos: '}
                    {trechos.map((marca) => marca.numero).join(', ')}
                  </p>
                </>}
              </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2.5 rounded-controle bg-[var(--aluno-neutro-fundo)] px-4 py-3 text-[13px] leading-5 text-texto-suave">
            Esta correção não tem comentários específicos por
            critério. O comentário geral traz o retorno sobre a
            sua redação.
          </p>
        )}
      </div>
    </section>
  )
}

function TextoRedacao({ redacao, textoMarcado, vinculo, selecionar }) {
  const texto = redacao.texto?.trim()
  const { segmentos, legenda, total, marcacoes = [] } = textoMarcado
  const relacionadas = vinculo ? marcacoes.filter((marca) => vinculo.chaves.includes(chaveTrecho(marca))) : []

  return (
    <section
      aria-labelledby="feedback-titulo-redacao"
      className={`${classeCartao} superficie-folha px-[23px] pb-7 pt-[19px]`}
    >
      <div className="feedback-cabecalho-cartao flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="feedback-titulo-redacao"
          className="text-lg font-semibold leading-6 tracking-[-0.09px] text-texto"
        >
          <IconeEditorial tipo="redacao" />Sua redação
        </h2>
        <p className="text-xs font-medium leading-[17px] text-texto-suave">
          {redacao.origemTexto === 'OCR'
            ? 'Imagem digitalizada'
            : 'Texto digitado'}
        </p>
      </div>

      {texto && total > 0 && (
        <>
          <ul
            className="feedback-trechos-legenda"
            aria-label="Trechos comentados por critério"
          >
            {legenda.map((item) => (
              <li key={item.ordem} className={`feedback-tom-${item.tom}`}>
                <span className="feedback-trechos-cor" aria-hidden="true" />
                <span>
                  {item.nome}: {item.quantidade}{' '}
                  {item.quantidade === 1
                    ? 'trecho comentado'
                    : 'trechos comentados'}
                </span>
              </li>
            ))}
          </ul>
          <p className="feedback-trechos-nota">
            Selecione um número para ver os comentários do trecho.
            Um mesmo trecho pode ser comentado em mais de um critério.
          </p>
        </>
      )}

      {vinculo?.destinos.length > 1 && <VinculosDoTrecho vinculo={vinculo} />}

      {texto ? (
        <div className="feedback-texto-redacao mt-2.5 whitespace-pre-wrap break-words fonte-redacao text-[17px] leading-8 text-texto">
          {total > 0
            ? segmentos.map((segmento) => {
                if (!segmento.criterios.length) {
                  return (
                    <span key={`${segmento.inicio}-${segmento.fim}`}>
                      {segmento.texto}
                    </span>
                  )
                }

                const selos = marcacoes.filter((marca) => marca.inicio === segmento.inicio)
                const relacionado = relacionadas.some((marca) =>
                  marca.inicio <= segmento.inicio && marca.fim >= segmento.fim)
                const tons = [
                  ...new Set(
                    segmento.criterios.map(
                      (ordem) =>
                        legenda.find((item) => item.ordem === ordem)?.tom,
                    ),
                  ),
                ].filter(Boolean)

                return (
                  <mark
                    key={`${segmento.inicio}-${segmento.fim}`}
                    className={`feedback-trecho feedback-tom-${tons[0]}${relacionado ? ' trecho-em-foco' : ''}`}
                    style={tons.length > 1 ? {
                      '--feedback-faixas': tons.map((tom) => `linear-gradient(var(--criterio-${tom}),var(--criterio-${tom}))`).join(','),
                      '--feedback-faixas-posicao': tons.map((_, i) => `left bottom ${i * 2}px`).join(','),
                    } : undefined}
                  >
                    {selos.map((marca) => {
                      const chave = chaveTrecho(marca)
                      const id = `feedback-marca-${chave}`
                      const tom = obterTomDaMarca(marca.ordens)
                      const destinos = marca.ordens.map((ordem) => ({
                        id: `feedback-comentario-${ordem}`,
                        nome: legenda.find((c) => c.ordem === ordem)?.nome,
                      }))
                      return <span key={chave} className={`feedback-tom-${tom}`}>
                        <button type="button" id={id} className="feedback-selo-trecho" data-numero={marca.numero}
                          aria-label={`Trecho ${marca.numero}: ${destinos.map((d) => d.nome).join(', ')}`}
                          aria-pressed={Boolean(vinculo?.chaves.includes(chave))}
                          onClick={() => selecionar({ origem: id, chaves: [chave], criterios: marca.ordens, destinos, numero: marca.numero },
                            destinos.length === 1 ? destinos[0].id : undefined)} />
                        <span className="feedback-selo-trecho feedback-so-impressao" data-numero={marca.numero} aria-label={`Trecho ${marca.numero}`} />
                      </span>
                    })}
                    {segmento.texto}
                  </mark>
                )
              })
            : redacao.texto}
        </div>
      ) : (
        <p className="mt-2.5 text-sm leading-[22px] text-texto-suave">
          O texto desta redação não está disponível.
        </p>
      )}
    </section>
  )
}

export default function AlunoFeedbackPage() {
  const { redacaoId } = useParams()
  const { usuario } = useAuth()
  return <FeedbackDaRedacao key={`${usuario?.id}:${redacaoId}`} redacaoId={redacaoId} nomeAluno={usuario?.nome} />
}

function FeedbackDaRedacao({ redacaoId, nomeAluno }) {
  const { vinculo, selecionar, aoPressionarTecla } = useVinculoDeTrechos()
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

    let ativo = true
    marcarNotificacoesDaRedacaoComoLidas(redacaoId, () => ativo).catch(
      () => {},
    )
    return () => { ativo = false }
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
    const textoMarcado = montarTextoComTrechos(redacao.texto, feedback.criterios)

    conteudo = (
      <>
        <div className="feedback-so-impressao feedback-folha-identidade">
          <p className="brand-wordmark">LÉXIS</p>
          <p>Aluno: <strong>{nomeAluno}</strong></p>
          <p>Turma: <strong>{redacao.tema?.turma?.nome}</strong></p>
        </div>
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
          <CompetenciaDois feedback={feedback} marcacoes={textoMarcado.marcacoes ?? []} vinculo={vinculo} selecionar={selecionar} />
          <TextoRedacao redacao={redacao} textoMarcado={textoMarcado} vinculo={vinculo} selecionar={selecionar} />
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
          <Botao as={Link}
            to={indisponivel.acao.destino}
            variante="secundario" tamanho="compacto"
          >
            {indisponivel.acao.rotulo}
          </Botao>
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
            <Botao
              type="button"
              onClick={() =>
                setTentativa((atual) => atual + 1)
              }
              tamanho="compacto">
              Tentar novamente
            </Botao>
          )}
          <Botao as={Link}
            to="/aluno"
            variante="secundario" tamanho="compacto"
          >
            Voltar ao início
          </Botao>
        </CartaoAviso>
      </>
    )
  }

  return (
    <AppShell
      rotaEnviarRedacao={rotaEnviarRedacao}
      trilha={TRILHA}
    >
      <div className="aluno-feedback" onKeyDown={aoPressionarTecla}>
        {conteudo}
      </div>
    </AppShell>
  )
}
