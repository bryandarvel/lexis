import {
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  Navigate,
  useNavigate,
  useParams,
} from 'react-router'

import { useAuth } from '../../hooks/useAuth.js'
import AlunoLayout from '../../layouts/AlunoLayout.jsx'
import { confirmarRevisaoOcr } from '../../services/redacoes.js'
import {
  atualizarTextoRevisaoOcr,
  descartarRevisaoOcr,
  obterRevisaoOcr,
} from '../../services/revisao-ocr-pendente.js'
import {
  descreverExtensao,
  LIMITE_CARACTERES_REDACAO,
} from '../../utils/essay-editor.js'
import {
  descreverArquivo,
  descreverEtapaAtual,
  mensagemErroRevisaoOcr,
  PASSOS_ENVIO_FOTO,
} from '../../utils/ocr-revisao.js'

const etapaAtual = descreverEtapaAtual(PASSOS_ENVIO_FOTO)

const classeBotaoContorno =
  'rounded-lg border border-[var(--aluno-borda-campo)] bg-lexis-900 text-[13px] font-semibold leading-[18px] text-lexis-100 transition-colors hover:bg-[var(--aluno-neutro-fundo)] disabled:cursor-not-allowed disabled:opacity-55'

function IconeConcluido() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  )
}

function IconeFoto() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8 text-[var(--aluno-acao-suave-texto)]"
    >
      <path d="M4 7h3l2-3h6l2 3h3v12H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function EtapasEnvioFoto() {
  return (
    <nav
      aria-label="Etapas do envio por foto"
      className="mt-[23px]"
    >
      <ol className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-[var(--surface-border)] bg-lexis-900 px-[18px] py-[14px] sm:flex sm:flex-wrap sm:gap-x-0 sm:gap-y-2">
        {PASSOS_ENVIO_FOTO.map((passo, indice) => {
          const concluido = passo.estado === 'concluido'
          const situacao = {
            concluido: 'concluída',
            atual: 'etapa atual',
            pendente: 'próxima etapa',
          }[passo.estado]

          return (
            <li
              key={passo.rotulo}
              aria-current={
                passo.estado === 'atual'
                  ? 'step'
                  : undefined
              }
              className="flex items-center gap-2 sm:w-[260px]"
            >
              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium leading-[17px] ${
                  concluido
                    ? 'bg-[var(--aluno-sucesso)] text-lexis-900'
                    : 'bg-[var(--aluno-trilho)] text-lexis-200'
                }`}
              >
                {concluido ? (
                  <IconeConcluido />
                ) : (
                  indice + 1
                )}
              </span>
              <span
                className={`text-sm leading-[22px] ${
                  concluido
                    ? 'text-lexis-100'
                    : 'text-lexis-200'
                }`}
              >
                {passo.rotulo}
                <span className="sr-only">
                  {' '}({situacao})
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function FotoEnviada({
  imagem,
  desabilitado,
  onEnviarOutra,
}) {
  const [foto, setFoto] = useState({
    url: null,
    status: imagem ? 'carregando' : 'indisponivel',
  })

  useEffect(() => {
    if (!imagem) return undefined

    const url = URL.createObjectURL(imagem)

    setFoto({
      url,
      status: 'carregando',
    })

    return () => URL.revokeObjectURL(url)
  }, [imagem])

  const indisponivel = foto.status === 'indisponivel'

  return (
    <section
      aria-labelledby="titulo-foto-enviada"
      className="aluno-elevacao-1 flex flex-col rounded-xl border border-[var(--surface-border)] bg-lexis-900 pb-8 pl-[18px] pr-5 pt-[14px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="titulo-foto-enviada"
          className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50"
        >
          Foto enviada
        </h2>
        {imagem && (
          <p className="min-w-0 truncate text-xs font-medium leading-[17px] text-lexis-200">
            {descreverArquivo(imagem)}
          </p>
        )}
      </div>

      <div className="relative mt-2 flex h-[260px] items-center justify-center overflow-hidden rounded-lg bg-[var(--aluno-trilho)] sm:h-[360px]">
        {foto.url && !indisponivel && (
          <img
            src={foto.url}
            alt="Foto da redação enviada para transcrição"
            onLoad={() =>
              setFoto((atual) => ({
                ...atual,
                status: 'pronta',
              }))
            }
            onError={() =>
              setFoto({
                url: null,
                status: 'indisponivel',
              })
            }
            className="h-full w-full object-contain"
          />
        )}

        {foto.status === 'carregando' && (
          <div
            role="status"
            className="absolute inset-0 animate-pulse bg-[var(--aluno-trilho)]"
          >
            <span className="sr-only">
              Carregando a foto enviada...
            </span>
          </div>
        )}

        {indisponivel && (
          <div className="flex flex-col items-center gap-2 px-8 text-center">
            <IconeFoto />
            <p className="text-sm font-semibold leading-[22px] text-lexis-50">
              Foto indisponível
            </p>
            <p className="max-w-[360px] text-xs font-medium leading-[17px] text-lexis-200">
              A foto fica só na memória do navegador e não pôde ser exibida. O texto transcrito continua ao lado; se precisar conferir a imagem, envie outra foto.
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs font-medium leading-[17px] text-lexis-200">
        A imagem nunca é recortada. Se faltar linha, envie outra foto.
      </p>
      <button
        type="button"
        onClick={onEnviarOutra}
        disabled={desabilitado}
        className={`mt-[5px] h-9 w-full sm:w-[160px] ${classeBotaoContorno}`}
      >
        Enviar outra foto
      </button>
    </section>
  )
}

export default function AlunoRevisaoOcrPage() {
  const { temaId } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const vinculo = {
    usuarioId: usuario?.id,
    temaId,
  }
  // Lida a cada render: a revisão só aparece enquanto pertencer ao aluno
  // autenticado agora e à proposta da rota.
  const revisao = obterRevisaoOcr(vinculo)
  const possuiRevisao = Boolean(revisao)
  const [texto, setTexto] = useState(
    () => revisao?.textoRevisado ?? '',
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [, reverificarVinculo] = useReducer(
    (versao) => versao + 1,
    0,
  )
  const tituloRef = useRef(null)
  const textareaRef = useRef(null)

  const rotaEditor = `/aluno/temas/${encodeURIComponent(temaId)}/redacao`

  useEffect(() => {
    tituloRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!possuiRevisao) return undefined

    function confirmarSaida(evento) {
      evento.preventDefault()
      evento.returnValue = ''
    }

    globalThis.addEventListener(
      'beforeunload',
      confirmarSaida,
    )

    return () =>
      globalThis.removeEventListener(
        'beforeunload',
        confirmarSaida,
      )
  }, [possuiRevisao])

  if (!revisao) {
    return (
      <Navigate
        to={rotaEditor}
        replace
        state={{
          aba: 'foto',
          aviso: {
            tipo: 'info',
            mensagem:
              'Não há transcrição aguardando revisão. A foto e o texto extraído ficam só na memória do navegador e são descartados ao recarregar a página; envie a foto novamente.',
          },
        }}
      />
    )
  }

  function voltarAoEditor(estado) {
    descartarRevisaoOcr()
    navigate(rotaEditor, {
      state: estado,
    })
  }

  // O vínculo deixou de bater: limpa o estado local e força um novo render,
  // que já não encontra a revisão e mostra o estado de revisão indisponível.
  function encerrarRevisaoSemVinculo() {
    setTexto('')
    setErro('')
    setSalvando(false)
    reverificarVinculo()
  }

  function handleAlterarTexto(evento) {
    const novoTexto = evento.target.value

    if (
      !atualizarTextoRevisaoOcr({
        ...vinculo,
        texto: novoTexto,
      })
    ) {
      encerrarRevisaoSemVinculo()
      return
    }

    setTexto(novoTexto)
    setErro('')
  }

  async function handleAceitar() {
    if (!obterRevisaoOcr(vinculo)) {
      encerrarRevisaoSemVinculo()
      return
    }

    if (!texto.trim()) {
      setErro(
        'A transcrição revisada não pode ficar vazia.',
      )
      textareaRef.current?.focus()
      return
    }

    setSalvando(true)
    setErro('')

    try {
      await confirmarRevisaoOcr(temaId, texto)
      descartarRevisaoOcr()
      navigate(rotaEditor, {
        replace: true,
        state: {
          aviso: {
            tipo: 'sucesso',
            mensagem:
              'Transcrição revisada e salva como rascunho.',
          },
        },
      })
    } catch (falha) {
      setErro(mensagemErroRevisaoOcr(falha))
      setSalvando(false)
    }
  }

  const substituiRascunho = Boolean(
    revisao.textoAnterior?.trim(),
  )

  return (
    <AlunoLayout
      rotaEnviarRedacao={rotaEditor}
      trilha={[
        'Enviar redação',
        'Revisar transcrição',
      ]}
    >
      <h1
        ref={tituloRef}
        tabIndex={-1}
        className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50 outline-none"
      >
        Revise a transcrição
      </h1>
      <p className="mt-[11px] text-base leading-[25px] text-lexis-200">
        {etapaAtual} — o texto abaixo foi extraído da sua foto. Corrija o que estiver errado antes de enviar.
      </p>

      <EtapasEnvioFoto />

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,544fr)_minmax(0,560fr)]">
        <FotoEnviada
          imagem={revisao.imagem}
          desabilitado={salvando}
          onEnviarOutra={() =>
            voltarAoEditor({
              aba: 'foto',
            })
          }
        />

        <section
          aria-labelledby="titulo-texto-extraido"
          aria-busy={salvando}
          className="flex flex-col rounded-xl border-2 border-[var(--color-brand-accent)] bg-lexis-900 pb-4 pl-4 pr-5 pt-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2
              id="titulo-texto-extraido"
              className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50"
            >
              Texto extraído — editável
            </h2>
            <p
              id="extensao-transcricao"
              className="text-xs font-medium leading-[17px] text-lexis-200"
            >
              {descreverExtensao(texto)}
            </p>
          </div>

          <textarea
            ref={textareaRef}
            value={texto}
            onChange={handleAlterarTexto}
            readOnly={salvando}
            maxLength={LIMITE_CARACTERES_REDACAO}
            aria-labelledby="titulo-texto-extraido"
            aria-describedby="extensao-transcricao orientacao-transcricao"
            aria-invalid={Boolean(erro)}
            className="font-editorial mt-2.5 h-[360px] w-full resize-none rounded-lg border border-[var(--aluno-borda-campo)] bg-[var(--aluno-neutro-fundo)] p-3 text-[17px] leading-8 text-lexis-100 outline-none read-only:cursor-wait"
          />

          <p
            id="orientacao-transcricao"
            className="mt-3.5 text-xs font-medium leading-[17px] text-lexis-200"
          >
            A transcrição automática pode conter erros. Nada é salvo até você aceitar.
            {substituiRascunho &&
              ' Ao aceitar, este texto substitui o rascunho atual.'}
          </p>
          <p
            id="ajuda-voltar"
            className="sr-only"
          >
            Voltar descarta esta transcrição e retorna ao editor.
          </p>

          {erro && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-[var(--aluno-neutro-fundo)] px-3.5 py-2.5 text-sm font-medium leading-[22px] text-[var(--aluno-erro)]"
            >
              {erro}
            </p>
          )}

          <div className="mt-[11px] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => voltarAoEditor()}
              disabled={salvando}
              aria-describedby="ajuda-voltar"
              className={`h-[42px] w-full sm:w-[160px] ${classeBotaoContorno}`}
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleAceitar}
              disabled={salvando}
              className="h-[42px] w-full rounded-lg bg-[var(--color-brand-accent)] text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-55 sm:w-[200px]"
            >
              {salvando
                ? 'Salvando...'
                : 'Aceitar e continuar'}
            </button>
          </div>
        </section>
      </div>
    </AlunoLayout>
  )
}
