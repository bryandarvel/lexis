import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'

import AlunoLayout from '../../layouts/AlunoLayout.jsx'
import { obterDesempenhoAluno } from '../../services/desempenho.js'
import { observarMatriculaAtualizada } from '../../services/matricula-events.js'
import {
  listarMinhasRedacoes,
} from '../../services/redacoes.js'
import {
  listarTemasDoAluno,
} from '../../services/temas.js'
import {
  entrarEmTurma,
  obterMinhaMatricula,
} from '../../services/turmas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import {
  calcularPercentual,
  descreverRedacao,
  descreverTempoDesde,
  descreverTurma,
  encontrarRascunhoDoTema,
  formatarIndicador,
  formatarPrazoEntrega,
  listarPropostasDoAluno,
} from '../../utils/aluno-painel.js'
import { normalizarCodigoAcesso } from '../../utils/class-code.js'

const CODIGO_SEM_MATRICULA = 'ACTIVE_ENROLLMENT_NOT_FOUND'
const INTERVALO_RELOGIO_MS = 60_000

const BLOCO_CARREGANDO = {
  status: 'carregando',
  dados: null,
}

const CORES_FAIXA = {
  sucesso: 'bg-[var(--aluno-sucesso)]',
  neutro: 'bg-[var(--aluno-borda-campo)]',
}

const CORES_NOTA = {
  sucesso:
    'bg-[var(--aluno-sucesso-fundo)] text-[var(--aluno-sucesso)]',
  atencao:
    'bg-[var(--aluno-atencao-fundo)] text-[var(--aluno-atencao)]',
  neutro:
    'bg-[var(--aluno-neutro-fundo)] text-lexis-200',
}

const CLASSES_ACAO = {
  suave:
    'bg-[var(--aluno-acao-suave)] text-[var(--aluno-acao-suave-texto)] hover:brightness-95',
  contorno:
    'border border-[var(--aluno-borda-campo)] bg-lexis-900 text-lexis-100 hover:bg-[var(--aluno-neutro-fundo)]',
}

const classeCartao =
  'rounded-xl border border-[var(--surface-border)] bg-lexis-900'

function indicaSemMatricula(erro) {
  return (
    erro?.response?.status === 404 &&
    erro?.response?.data?.error?.code ===
      CODIGO_SEM_MATRICULA
  )
}

function resolverBloco(
  resultado,
  {
    vazio = null,
    semMatricula = null,
  } = {},
) {
  if (resultado.status === 'fulfilled') {
    return {
      status: 'pronto',
      dados: resultado.value ?? vazio,
    }
  }

  if (
    semMatricula &&
    indicaSemMatricula(resultado.reason)
  ) {
    return semMatricula
  }

  return {
    status: 'erro',
    dados: vazio,
  }
}

async function carregarPainel() {
  const [
    matricula,
    temas,
    redacoes,
    desempenho,
  ] = await Promise.allSettled([
    obterMinhaMatricula(),
    listarTemasDoAluno(),
    listarMinhasRedacoes(),
    obterDesempenhoAluno(),
  ])

  return {
    matricula: resolverBloco(matricula, {
      semMatricula: {
        status: 'sem-turma',
        dados: null,
      },
    }),
    temas: resolverBloco(temas, {
      vazio: [],
      semMatricula: {
        status: 'pronto',
        dados: [],
      },
    }),
    redacoes: resolverBloco(redacoes, {
      vazio: [],
    }),
    desempenho: resolverBloco(desempenho),
  }
}

function combinarStatus(...blocos) {
  if (blocos.some((bloco) => bloco.status === 'erro')) {
    return 'erro'
  }

  if (
    blocos.some(
      (bloco) => bloco.status === 'carregando',
    )
  ) {
    return 'carregando'
  }

  return 'pronto'
}

function EsqueletoCartao({
  rotulo,
  className = '',
}) {
  return (
    <div
      role="status"
      className={`${classeCartao} min-h-[236px] animate-pulse p-6 ${className}`}
    >
      <span className="sr-only">{rotulo}</span>
      <div className="h-6 w-40 rounded-full bg-lexis-800" />
      <div className="mt-6 h-7 w-3/4 rounded bg-lexis-800" />
      <div className="mt-4 h-4 w-1/2 rounded bg-lexis-800" />
      <div className="mt-8 h-11 w-[220px] max-w-full rounded-lg bg-lexis-800" />
    </div>
  )
}

function CartaoProposta({
  status,
  proposta,
  rascunho,
  agora,
  descricao,
}) {
  if (status === 'carregando') {
    return (
      <EsqueletoCartao rotulo="Carregando a próxima proposta..." />
    )
  }

  if (status === 'erro') {
    return (
      <section
        aria-labelledby="titulo-proposta"
        className={`${classeCartao} flex min-h-[236px] flex-col justify-center p-6`}
      >
        <h2
          id="titulo-proposta"
          className="aluno-titulo-interface text-lg font-semibold leading-6"
        >
          Proposta indisponível
        </h2>
        <p
          role="alert"
          className="mt-2 text-sm leading-[22px] text-lexis-200"
        >
          Não foi possível carregar as propostas da sua turma. Recarregue a página para tentar novamente.
        </p>
      </section>
    )
  }

  if (!proposta) {
    return (
      <section
        aria-labelledby="titulo-proposta"
        className={`${classeCartao} flex min-h-[236px] flex-col justify-center p-6`}
      >
        <h2
          id="titulo-proposta"
          className="aluno-titulo-interface text-lg font-semibold leading-6"
        >
          Nenhuma proposta pendente
        </h2>
        <p className="mt-2 max-w-[520px] text-sm leading-[22px] text-lexis-200">
          Quando houver uma proposta para escrever, ela aparecerá aqui. Consulte abaixo as propostas da sua turma e acompanhe as redações já enviadas.
        </p>
      </section>
    )
  }

  const turma = descreverTurma(proposta.turma)
  const tempoRascunho = rascunho
    ? descreverTempoDesde(rascunho.atualizadoEm, agora)
    : null

  return (
    <section
      aria-labelledby="titulo-proposta"
      className="min-h-[236px] rounded-xl border-2 border-[var(--color-brand-accent)] bg-lexis-900 px-[22px] pb-[11px] pt-[22px]"
    >
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex h-6 min-w-[150px] items-center justify-center rounded-full bg-[var(--aluno-sucesso-fundo)] px-4 text-xs font-medium uppercase leading-[17px] text-[var(--aluno-sucesso)]">
          {descricao.prazoVencido ? 'Prazo vencido' : 'Proposta aberta'}
        </span>
        {turma && (
          <span className="inline-block h-6 max-w-full truncate rounded-full bg-[var(--aluno-acao-suave)] px-[22px] text-xs font-medium leading-6 text-[var(--aluno-acao-suave-texto)]">
            {turma}
          </span>
        )}
      </div>

      <h2
        id="titulo-proposta"
        className="mt-3.5 text-2xl font-semibold leading-[30px] tracking-[-0.29px] text-lexis-50"
      >
        {proposta.enunciado}
      </h2>

      <p className="mt-3 text-sm leading-[22px] text-lexis-200">
        Entrega até {formatarPrazoEntrega(proposta.prazoEntrega)}
      </p>
      <p className="mt-2 text-sm leading-[22px] text-lexis-200">
        {descricao.orientacao}
      </p>

      <Link
        to={`/aluno/temas/${encodeURIComponent(proposta.id)}/redacao`}
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--color-brand-accent)] text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110 sm:w-[220px]"
      >
        {rascunho ? 'Continuar rascunho' : 'Escrever redação'}
      </Link>

      {tempoRascunho && (
        <p className="mt-3 text-xs font-medium leading-[17px] text-lexis-200">
          Rascunho salvo no servidor {tempoRascunho}.
        </p>
      )}
    </section>
  )
}

function ListaPropostas({ status, propostas }) {
  return (
    <section aria-labelledby="titulo-propostas-turma" className="mt-8">
      <h2 id="titulo-propostas-turma" className="aluno-titulo-interface text-xl font-semibold leading-[26px] text-lexis-50">
        Propostas da turma
      </h2>
      <p className="mt-2 text-sm leading-[22px] text-lexis-200">
        Escolha a proposta que deseja abrir. Propostas com prazo vencido também permitem entrega, registrada com atraso.
      </p>
      {status === 'carregando' && (
        <div role="status" className={`${classeCartao} mt-4 h-32 animate-pulse`}>
          <span className="sr-only">Carregando as propostas da turma...</span>
        </div>
      )}
      {status === 'erro' && (
        <p role="alert" className={`${classeCartao} mt-4 p-6 text-sm text-lexis-200`}>
          Não foi possível carregar a lista e a situação das propostas. Recarregue a página para tentar novamente.
        </p>
      )}
      {status === 'pronto' && propostas.length === 0 && (
        <p className={`${classeCartao} mt-4 p-6 text-sm text-lexis-200`}>
          Sua turma ainda não tem propostas disponíveis.
        </p>
      )}
      {status === 'pronto' && propostas.length > 0 && (
        <ul className="mt-4 space-y-3">
          {propostas.map(({ proposta, prazoVencido, situacao, orientacao, acao }) => (
            <li key={proposta.id} className={`${classeCartao} flex min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="min-w-0">
                <h3 className="break-words text-lg font-semibold leading-6 text-lexis-50">{proposta.enunciado}</h3>
                <p className="mt-2 text-sm font-semibold text-lexis-200">{situacao}</p>
                <p className="mt-1 text-sm leading-[22px] text-lexis-200">
                  {prazoVencido ? 'Prazo vencido em ' : 'Entrega até '}{formatarPrazoEntrega(proposta.prazoEntrega)}
                </p>
                <p className="mt-1 text-sm leading-[22px] text-lexis-200">{orientacao}</p>
              </div>
              <Link to={acao.destino} className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-5 text-[13px] font-semibold transition ${CLASSES_ACAO[acao.variante]}`}>
                {acao.rotulo}
                <span className="sr-only">{' '}— {proposta.enunciado}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Indicador({
  rotulo,
  valor,
  unidade,
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium leading-[17px] text-lexis-200">
        {rotulo}
      </dt>
      <dd className="mt-px">
        {valor === null ? (
          <>
            <span
              aria-hidden="true"
              className="font-display block text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50"
            >
              —
            </span>
            <span className="sr-only">
              Ainda sem nota
            </span>
          </>
        ) : (
          <span className="font-display block text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50">
            {valor}
          </span>
        )}
        <span className="block text-xs font-medium leading-[17px] text-lexis-200">
          {unidade}
        </span>
      </dd>
    </div>
  )
}

function CartaoDesempenho({ bloco }) {
  if (bloco.status === 'carregando') {
    return (
      <EsqueletoCartao rotulo="Carregando seu desempenho..." />
    )
  }

  if (bloco.status === 'erro') {
    return (
      <section
        aria-labelledby="titulo-desempenho"
        className={`${classeCartao} aluno-elevacao-1 min-h-[236px] px-5 pb-4 pt-[18px]`}
      >
        <h2
          id="titulo-desempenho"
          className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px]"
        >
          Seu desempenho
        </h2>
        <p
          role="alert"
          className="mt-3 text-sm leading-[22px] text-lexis-200"
        >
          Não foi possível carregar seu desempenho. Recarregue a página para tentar novamente.
        </p>
      </section>
    )
  }

  const desempenho = bloco.dados
  const mediaGeral = formatarIndicador(
    desempenho.mediaGeral,
  )
  const ultimaNota = formatarIndicador(
    desempenho.ultimaNota,
  )
  const mediaCompetencia2 = formatarIndicador(
    desempenho.mediaCompetencia2,
  )
  const possuiMediaCompetencia2 =
    mediaCompetencia2 !== null

  return (
    <section
      aria-labelledby="titulo-desempenho"
      className={`${classeCartao} aluno-elevacao-1 min-h-[236px] px-5 pb-4 pt-[18px]`}
    >
      <h2
        id="titulo-desempenho"
        className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px]"
      >
        Seu desempenho
      </h2>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Indicador
          rotulo="Média geral"
          valor={mediaGeral}
          unidade="/1000"
        />
        <Indicador
          rotulo="Última nota"
          valor={ultimaNota}
          unidade="/1000"
        />
        <Indicador
          rotulo="Enviadas"
          valor={formatarIndicador(
            desempenho.totalEnviadas,
          )}
          unidade={
            desempenho.totalEnviadas === 1
              ? 'redação'
              : 'redações'
          }
        />
      </dl>

      <div className="mt-[13px] border-t border-[var(--surface-border)] pt-[13px]">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium leading-[17px] text-lexis-300">
            Competência II — repertório
          </span>
          <span className="text-[13px] font-semibold leading-[18px] text-lexis-300">
            {possuiMediaCompetencia2 ? (
              `${mediaCompetencia2} / 200`
            ) : (
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">
                  Ainda sem média
                </span>
              </>
            )}
          </span>
        </p>

        {possuiMediaCompetencia2 && (
          <div
            aria-hidden="true"
            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--aluno-trilho)]"
          >
            <div
              className="h-full rounded-full bg-[var(--color-brand-accent)]"
              style={{
                width: `${calcularPercentual(
                  desempenho.mediaCompetencia2,
                  200,
                )}%`,
              }}
            />
          </div>
        )}

        <p className="mt-2.5 text-xs font-medium leading-[17px] text-lexis-200">
          {possuiMediaCompetencia2
            ? 'Média das suas redações corrigidas'
            : 'Suas médias aparecem aqui depois da primeira correção publicada.'}
        </p>
      </div>
    </section>
  )
}

function LinhaRedacao({
  redacao,
  turmaAtivaId,
}) {
  const descricao = descreverRedacao(redacao)
  const titulo =
    redacao.tema?.enunciado ?? 'Tema indisponível'
  // O editor só abre temas da turma ativa; a correção publicada continua acessível.
  const exibirAcao =
    redacao.status === 'AVALIADA' ||
    turmaAtivaId === undefined ||
    redacao.tema?.turma?.id === turmaAtivaId

  return (
    <li
      className={`${classeCartao} aluno-elevacao-1 relative flex flex-col gap-4 overflow-hidden py-5 pl-7 pr-5 md:grid md:min-h-[92px] md:grid-cols-[minmax(0,548px)_150px_minmax(0,1fr)_160px] md:items-center md:gap-x-6 md:pr-7`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 ${CORES_FAIXA[descricao.faixa]}`}
      />

      <div className="min-w-0">
        <h3 className="break-words text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50">
          {titulo}
        </h3>
        <p className="mt-1 text-xs font-medium leading-[17px] text-lexis-200">
          {descricao.legenda}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:contents">
        <span
          className={`inline-flex h-6 w-[150px] items-center justify-center rounded-full text-xs font-medium leading-[17px] md:col-start-2 ${CORES_NOTA[descricao.nota.tom]}`}
        >
          {descricao.nota.texto}
        </span>

        {exibirAcao && (
          <Link
            to={descricao.acao.destino}
            className={`inline-flex h-10 w-[160px] items-center justify-center rounded-lg text-[13px] font-semibold leading-[18px] transition md:col-start-4 ${CLASSES_ACAO[descricao.acao.variante]}`}
          >
            {descricao.acao.rotulo}
            <span className="sr-only">
              {' '}— {titulo}
            </span>
          </Link>
        )}
      </div>
    </li>
  )
}

function ListaRedacoes({
  bloco,
  turmaAtivaId,
}) {
  return (
    <section
      aria-labelledby="titulo-minhas-redacoes"
      className="mt-8"
    >
      <h2
        id="titulo-minhas-redacoes"
        className="aluno-titulo-interface text-xl font-semibold leading-[26px] tracking-[-0.16px] text-lexis-50"
      >
        Minhas redações
      </h2>

      {bloco.status === 'carregando' && (
        <div
          role="status"
          className="mt-4 space-y-3"
        >
          <span className="sr-only">
            Carregando suas redações...
          </span>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={`${classeCartao} h-[92px] animate-pulse`}
            />
          ))}
        </div>
      )}

      {bloco.status === 'erro' && (
        <p
          role="alert"
          className={`${classeCartao} mt-4 p-6 text-sm leading-[22px] text-lexis-200`}
        >
          Não foi possível carregar suas redações. Recarregue a página para tentar novamente.
        </p>
      )}

      {bloco.status === 'pronto' &&
        bloco.dados.length === 0 && (
          <p
            className={`${classeCartao} mt-4 p-6 text-sm leading-[22px] text-lexis-200`}
          >
            Você ainda não começou nenhuma redação. Quando escrever a primeira, ela aparecerá aqui.
          </p>
        )}

      {bloco.status === 'pronto' &&
        bloco.dados.length > 0 && (
          <ul className="mt-4 space-y-3">
            {bloco.dados.map((redacao) => (
              <LinhaRedacao
                key={redacao.id}
                redacao={redacao}
                turmaAtivaId={turmaAtivaId}
              />
            ))}
          </ul>
        )}
    </section>
  )
}

function FormularioEntrarTurma({ onEntrou }) {
  const idCampo = useId()
  const idAjuda = useId()
  const [codigoAcesso, setCodigoAcesso] =
    useState('')
  const [estado, setEstado] = useState({
    enviando: false,
    erro: '',
  })

  async function handleSubmit(evento) {
    evento.preventDefault()

    if (
      estado.enviando ||
      codigoAcesso.length !== 8
    ) {
      return
    }

    setEstado({
      enviando: true,
      erro: '',
    })

    try {
      await entrarEmTurma(codigoAcesso)
      setCodigoAcesso('')
      setEstado({
        enviando: false,
        erro: '',
      })
      await onEntrou()
    } catch (erro) {
      const {
        mensagem,
        campos,
      } = interpretarErroApi(
        erro,
        'Não foi possível entrar na turma.',
      )

      setEstado({
        enviando: false,
        erro: campos.codigoAcesso ?? mensagem,
      })
    }
  }

  return (
    <section
      aria-labelledby={`${idCampo}-titulo`}
      className="mt-[25px] max-w-[700px] rounded-xl border-2 border-[var(--color-brand-accent)] bg-lexis-900 p-6"
    >
      <h2
        id={`${idCampo}-titulo`}
        className="aluno-titulo-interface text-xl font-semibold leading-[26px] tracking-[-0.16px] text-lexis-50"
      >
        Entre na sua turma
      </h2>
      <p
        id={idAjuda}
        className="mt-1 text-sm leading-[22px] text-lexis-200"
      >
        Você ainda não participa de uma turma. Digite o código de oito caracteres enviado pelo professor para ver as propostas de redação.
      </p>

      <form
        onSubmit={handleSubmit}
        aria-busy={estado.enviando}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label
            htmlFor={idCampo}
            className="block text-xs font-medium leading-[17px] text-lexis-200"
          >
            Código da turma
          </label>
          <input
            id={idCampo}
            name="codigoAcesso"
            value={codigoAcesso}
            onChange={(evento) => {
              setCodigoAcesso(
                normalizarCodigoAcesso(
                  evento.target.value,
                ),
              )
              setEstado((atual) => ({
                ...atual,
                erro: '',
              }))
            }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="LEX3A2K9"
            aria-describedby={idAjuda}
            aria-invalid={
              codigoAcesso.length > 0 &&
              codigoAcesso.length !== 8
            }
            required
            className="mt-2 h-11 w-full rounded-lg border border-[var(--aluno-borda-campo)] bg-[var(--page-background)] px-4 font-mono text-base font-bold uppercase tracking-[0.16em] text-lexis-50"
          />
        </div>

        <button
          type="submit"
          disabled={
            estado.enviando ||
            codigoAcesso.length !== 8
          }
          className="h-11 rounded-lg bg-[var(--color-brand-accent)] px-5 text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {estado.enviando
            ? 'Entrando...'
            : 'Entrar na turma'}
        </button>
      </form>

      {estado.erro && (
        <p
          role="alert"
          className="mt-3 text-sm leading-[22px] text-[var(--aluno-erro)]"
        >
          {estado.erro}
        </p>
      )}
    </section>
  )
}

function SubtituloTurma({ bloco }) {
  if (bloco.status === 'carregando') {
    return (
      <span
        role="status"
        className="block h-[25px] w-72 max-w-full animate-pulse rounded bg-lexis-800"
      >
        <span className="sr-only">
          Carregando sua turma...
        </span>
      </span>
    )
  }

  if (bloco.status === 'sem-turma') {
    return 'Você ainda não está em uma turma.'
  }

  if (bloco.status === 'erro') {
    return 'Não foi possível carregar os dados da sua turma.'
  }

  return descreverTurma(bloco.dados?.turma)
}

export default function AlunoDashboardPage() {
  const [painel, setPainel] = useState({
    matricula: BLOCO_CARREGANDO,
    temas: BLOCO_CARREGANDO,
    redacoes: BLOCO_CARREGANDO,
    desempenho: BLOCO_CARREGANDO,
  })
  const [agora, setAgora] = useState(
    () => new Date(),
  )
  const [aviso, setAviso] = useState('')
  const [focarAviso, setFocarAviso] = useState(false)
  const avisoRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const avisoNavegacao = location.state?.aviso

  useEffect(() => {
    let ativo = true

    carregarPainel().then((dados) => {
      if (ativo) setPainel(dados)
    })

    const relogio = globalThis.setInterval(
      () => setAgora(new Date()),
      INTERVALO_RELOGIO_MS,
    )

    // A saída da turma acontece no diálogo do layout; o painel recarrega sem refresh.
    const pararObservacao = observarMatriculaAtualizada(
      () => {
        carregarPainel().then((dados) => {
          if (ativo) {
            setPainel(dados)
            setAgora(new Date())
          }
        })
      },
    )

    return () => {
      ativo = false
      globalThis.clearInterval(relogio)
      pararObservacao()
    }
  }, [])

  useEffect(() => {
    if (!avisoNavegacao) return

    setAviso(avisoNavegacao)
    setFocarAviso(true)
    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [avisoNavegacao, location.pathname, navigate])

  // Depois de sair da turma, o foco vai para a confirmação, que é anunciada.
  useEffect(() => {
    if (!focarAviso || !aviso) return

    avisoRef.current?.focus()
    setFocarAviso(false)
  }, [focarAviso, aviso])

  const recarregarAposMatricula = useCallback(
    async () => {
      const dados = await carregarPainel()

      setPainel(dados)
      setAgora(new Date())
      setAviso(
        'Matrícula realizada. Você já faz parte da turma.',
      )
    },
    [],
  )

  const semTurma =
    painel.matricula.status === 'sem-turma'
  const statusProposta = combinarStatus(
    painel.temas,
    painel.redacoes,
  )
  const propostas =
    statusProposta === 'pronto'
      ? listarPropostasDoAluno(
          painel.temas.dados,
          painel.redacoes.dados,
          agora,
        )
      : []
  const descricaoProposta = propostas.find((item) => item.podeEnviar) ?? null
  const proposta = descricaoProposta?.proposta ?? null
  const rascunhoProposta = proposta
    ? encontrarRascunhoDoTema(
        painel.redacoes.dados,
        proposta.id,
      )
    : null
  const possuiRedacoes =
    painel.redacoes.status === 'pronto' &&
    painel.redacoes.dados.length > 0
  // undefined: matrícula ainda desconhecida, as ações não são restringidas.
  const turmaAtivaId =
    painel.matricula.status === 'pronto'
      ? painel.matricula.dados?.turma?.id ?? null
      : semTurma
        ? null
        : undefined

  return (
    <AlunoLayout
      rotaEnviarRedacao={
        proposta
          ? `/aluno/temas/${encodeURIComponent(proposta.id)}/redacao`
          : null
      }
    >
      <header>
        <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50">
          Início
        </h1>
        <p className="mt-[11px] min-h-[25px] text-base leading-[25px] text-lexis-200">
          <SubtituloTurma bloco={painel.matricula} />
        </p>
      </header>

      {aviso && (
        <p
          ref={avisoRef}
          tabIndex={-1}
          role="status"
          className="mt-4 rounded-lg bg-[var(--aluno-sucesso-fundo)] px-4 py-3 text-sm font-medium leading-[22px] text-[var(--aluno-sucesso)]"
        >
          {aviso}
        </p>
      )}

      {semTurma ? (
        <>
          <FormularioEntrarTurma
            onEntrou={recarregarAposMatricula}
          />

          {possuiRedacoes && (
            <ListaRedacoes
              bloco={painel.redacoes}
              turmaAtivaId={turmaAtivaId}
            />
          )}
        </>
      ) : (
        <>
          <div className="mt-[25px] grid gap-6 xl:grid-cols-[minmax(0,1fr)_404px]">
            <CartaoProposta
              status={statusProposta}
              proposta={proposta}
              rascunho={rascunhoProposta}
              agora={agora}
              descricao={descricaoProposta}
            />
            <CartaoDesempenho
              bloco={painel.desempenho}
            />
          </div>

          <ListaPropostas status={statusProposta} propostas={propostas} />

          <ListaRedacoes
            bloco={painel.redacoes}
            turmaAtivaId={turmaAtivaId}
          />
        </>
      )}
    </AlunoLayout>
  )
}
