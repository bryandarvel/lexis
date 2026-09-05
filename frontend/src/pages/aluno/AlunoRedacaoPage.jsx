import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Link,
  useParams,
} from 'react-router'

import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import {
  confirmarRevisaoOcr,
  enviarRedacao,
  listarMinhasRedacoes,
  revisarLinguagemRedacao,
  salvarRascunho,
  transcreverImagemRedacao,
} from '../../services/redacoes.js'
import { obterTemaDoAluno } from '../../services/temas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import {
  aplicarSugestaoLinguistica,
  encontrarRedacaoPorTema,
  LIMITE_CARACTERES_REDACAO,
  precisaConfirmarSubstituicaoOcr,
  validarImagemRedacao,
} from '../../utils/essay-editor.js'

const INTERVALO_AUTOSAVE_MS = 1_500

function formatarData(valor) {
  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return 'Data indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(data)
}

function mensagemSalvamento(status, salvoEm) {
  if (status === 'salvando') {
    return 'Salvando rascunho...'
  }

  if (status === 'alterado') {
    return 'Alterações aguardando salvamento.'
  }

  if (status === 'erro') {
    return 'Não foi possível salvar. Seu texto permanece no editor; tente novamente.'
  }

  if (salvoEm) {
    return `Rascunho salvo em ${formatarData(salvoEm)}.`
  }

  return 'O rascunho será salvo automaticamente enquanto você escreve.'
}

export default function AlunoRedacaoPage() {
  const { temaId } = useParams()
  const [pagina, setPagina] = useState({
    status: 'carregando',
    tema: null,
    redacao: null,
  })
  const [texto, setTexto] = useState('')
  const [salvamento, setSalvamento] = useState({
    status: 'pronto',
    salvoEm: null,
  })
  const [aviso, setAviso] = useState(null)
  const [acao, setAcao] = useState(null)
  const [imagem, setImagem] = useState(null)
  const [progressoOcr, setProgressoOcr] =
    useState(0)
  const [revisaoOcr, setRevisaoOcr] = useState({
    pendente: false,
    textoAnterior: '',
  })
  const [revisaoLinguistica, setRevisaoLinguistica] =
    useState({
      status: 'inicial',
      disponivel: null,
      sugestoes: [],
      mensagem: '',
    })

  const textoAtualRef = useRef('')
  const ultimoTextoSalvoRef = useRef('')
  const textareaRef = useRef(null)
  const statusRef = useRef(null)

  textoAtualRef.current = texto

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        const [tema, redacoes] = await Promise.all([
          obterTemaDoAluno(temaId),
          listarMinhasRedacoes(),
        ])
        const redacao = encontrarRedacaoPorTema(
          redacoes,
          temaId,
        )
        const textoInicial = redacao?.texto ?? ''

        if (!ativo) {
          return
        }

        ultimoTextoSalvoRef.current = textoInicial
        setTexto(textoInicial)
        setSalvamento({
          status: 'pronto',
          salvoEm: redacao?.atualizadoEm ?? null,
        })
        setPagina({
          status: 'pronto',
          tema,
          redacao,
        })
      } catch (error) {
        if (!ativo) {
          return
        }

        setAviso({
          tipo: 'erro',
          mensagem: interpretarErroApi(
            error,
            'Não foi possível carregar o tema e o rascunho.',
          ).mensagem,
        })
        setPagina({
          status: 'erro',
          tema: null,
          redacao: null,
        })
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [temaId])

  const redacaoImutavel =
    pagina.redacao?.status &&
    pagina.redacao.status !== 'RASCUNHO'

  const salvarTexto = useCallback(
    async (textoParaSalvar = textoAtualRef.current) => {
      const textoLimpo = textoParaSalvar.trim()

      if (
        pagina.status !== 'pronto' ||
        redacaoImutavel ||
        revisaoOcr.pendente ||
        !textoLimpo ||
        textoParaSalvar === ultimoTextoSalvoRef.current
      ) {
        return pagina.redacao
      }

      setSalvamento((estado) => ({
        ...estado,
        status: 'salvando',
      }))

      try {
        const redacao = await salvarRascunho(
          temaId,
          textoParaSalvar,
        )

        ultimoTextoSalvoRef.current = textoParaSalvar
        setPagina((estado) => ({
          ...estado,
          redacao,
        }))
        setSalvamento({
          status:
            textoAtualRef.current === textoParaSalvar
              ? 'pronto'
              : 'alterado',
          salvoEm: redacao.atualizadoEm,
        })
        return redacao
      } catch (error) {
        setSalvamento((estado) => ({
          ...estado,
          status: 'erro',
        }))
        setAviso({
          tipo: 'erro',
          mensagem: interpretarErroApi(
            error,
            'Não foi possível salvar o rascunho.',
          ).mensagem,
        })
        throw error
      }
    },
    [
      pagina.redacao,
      pagina.status,
      redacaoImutavel,
      revisaoOcr.pendente,
      temaId,
    ],
  )

  useEffect(() => {
    if (
      pagina.status !== 'pronto' ||
      redacaoImutavel ||
      revisaoOcr.pendente ||
      texto === ultimoTextoSalvoRef.current ||
      !texto.trim()
    ) {
      return undefined
    }

    setSalvamento((estado) => ({
      ...estado,
      status: 'alterado',
    }))

    const timeoutId = globalThis.setTimeout(
      () => {
        salvarTexto(texto).catch(() => {})
      },
      INTERVALO_AUTOSAVE_MS,
    )

    return () => globalThis.clearTimeout(timeoutId)
  }, [
    pagina.status,
    redacaoImutavel,
    revisaoOcr.pendente,
    salvarTexto,
    texto,
  ])

  useEffect(() => {
    const possuiAlteracoes =
      !redacaoImutavel &&
      texto !== ultimoTextoSalvoRef.current

    if (!possuiAlteracoes) {
      return undefined
    }

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
  }, [redacaoImutavel, texto])

  async function handleSalvar(evento) {
    evento.preventDefault()
    setAviso(null)

    if (!texto.trim()) {
      setAviso({
        tipo: 'erro',
        mensagem: 'Escreva algum texto antes de salvar.',
      })
      textareaRef.current?.focus()
      return
    }

    setAcao('salvar')
    try {
      await salvarTexto(texto)
      setAviso({
        tipo: 'sucesso',
        mensagem: 'Rascunho salvo com segurança.',
      })
    } catch {
      // salvarTexto já atualiza o estado visual do erro.
    } finally {
      setAcao(null)
    }
  }

  async function handleOcr() {
    const erroImagem = validarImagemRedacao(imagem)

    if (erroImagem) {
      setAviso({
        tipo: 'erro',
        mensagem: erroImagem,
      })
      return
    }

    const textoAnterior = texto

    if (
      precisaConfirmarSubstituicaoOcr(
        textoAnterior,
      ) &&
      !globalThis.confirm(
        'O texto extraído será mostrado para revisão. Deseja substituir o conteúdo atual no editor? O rascunho salvo no servidor será preservado até sua confirmação.',
      )
    ) {
      return
    }

    setAcao('ocr')
    setAviso(null)
    setProgressoOcr(0)

    try {
      const resultado =
        await transcreverImagemRedacao(
          temaId,
          imagem,
          setProgressoOcr,
        )

      setTexto(resultado.textoExtraido)
      setRevisaoLinguistica({
        status: 'inicial',
        disponivel: null,
        sugestoes: [],
        mensagem: '',
      })
      setRevisaoOcr({
        pendente: true,
        textoAnterior,
      })
      setSalvamento((estado) => ({
        ...estado,
        status: 'alterado',
      }))
      setAviso({
        tipo: 'sucesso',
        mensagem:
          'Transcrição concluída. Revise o texto e confirme antes de enviá-lo ao servidor.',
      })
      globalThis.setTimeout(
        () => textareaRef.current?.focus(),
        0,
      )
    } catch (error) {
      setAviso({
        tipo: 'erro',
        mensagem: interpretarErroApi(
          error,
          'Não foi possível processar a imagem. Seu texto foi preservado.',
        ).mensagem,
      })
    } finally {
      setAcao(null)
    }
  }

  async function handleConfirmarOcr() {
    if (!texto.trim()) {
      setAviso({
        tipo: 'erro',
        mensagem:
          'A transcrição revisada não pode ficar vazia.',
      })
      textareaRef.current?.focus()
      return
    }

    setAcao('revisao-ocr')
    setAviso(null)

    try {
      const redacao = await confirmarRevisaoOcr(
        temaId,
        texto,
      )

      ultimoTextoSalvoRef.current = texto
      setPagina((estado) => ({
        ...estado,
        redacao,
      }))
      setRevisaoOcr({
        pendente: false,
        textoAnterior: '',
      })
      setSalvamento({
        status: 'pronto',
        salvoEm: redacao.atualizadoEm,
      })
      setAviso({
        tipo: 'sucesso',
        mensagem:
          'Texto do OCR revisado e salvo como rascunho.',
      })
    } catch (error) {
      setAviso({
        tipo: 'erro',
        mensagem: interpretarErroApi(
          error,
          'Não foi possível confirmar a revisão do OCR.',
        ).mensagem,
      })
    } finally {
      setAcao(null)
    }
  }

  async function handleRevisarLinguagem() {
    if (!texto.trim()) {
      setAviso({
        tipo: 'erro',
        mensagem:
          'Escreva algum texto antes de solicitar a revisão linguística.',
      })
      textareaRef.current?.focus()
      return
    }

    setAcao('linguagem')
    setAviso(null)
    setRevisaoLinguistica((estado) => ({
      ...estado,
      status: 'carregando',
    }))

    try {
      const revisao = await revisarLinguagemRedacao(
        temaId,
        texto,
      )

      setRevisaoLinguistica({
        status: 'pronto',
        disponivel: revisao.disponivel,
        sugestoes: revisao.sugestoes ?? [],
        mensagem:
          revisao.mensagem ??
          (revisao.sugestoes?.length > 0
            ? `${revisao.sugestoes.length} sugestão(ões) encontrada(s).`
            : 'Nenhuma sugestão foi encontrada.'),
      })
    } catch (error) {
      setRevisaoLinguistica({
        status: 'erro',
        disponivel: false,
        sugestoes: [],
        mensagem: interpretarErroApi(
          error,
          'Não foi possível solicitar a revisão linguística. Seu texto foi preservado.',
        ).mensagem,
      })
    } finally {
      setAcao(null)
    }
  }

  function handleAplicarSugestao(
    sugestao,
    substituicao,
  ) {
    const novoTexto = aplicarSugestaoLinguistica(
      texto,
      sugestao,
      substituicao,
    )

    if (novoTexto === null) {
      setAviso({
        tipo: 'erro',
        mensagem:
          'O texto mudou desde a revisão. Solicite uma nova revisão antes de aplicar esta sugestão.',
      })
      return
    }

    setTexto(novoTexto)
    setSalvamento((estado) => ({
      ...estado,
      status: 'alterado',
    }))
    setRevisaoLinguistica({
      status: 'inicial',
      disponivel: null,
      sugestoes: [],
      mensagem: '',
    })
    setAviso({
      tipo: 'sucesso',
      mensagem:
        'Sugestão aplicada no editor. Revise o resultado antes de salvar ou enviar.',
    })
    globalThis.setTimeout(
      () => textareaRef.current?.focus(),
      0,
    )
  }

  function handleRestaurarTexto() {
    const textoRestaurado = revisaoOcr.textoAnterior
    setTexto(textoRestaurado)
    setRevisaoLinguistica({
      status: 'inicial',
      disponivel: null,
      sugestoes: [],
      mensagem: '',
    })
    setRevisaoOcr({
      pendente: false,
      textoAnterior: '',
    })
    setSalvamento((estado) => ({
      ...estado,
      status:
        textoRestaurado ===
        ultimoTextoSalvoRef.current
          ? 'pronto'
          : 'alterado',
    }))
    setAviso({
      tipo: 'sucesso',
      mensagem:
        'O texto anterior foi restaurado; nenhum resultado do OCR foi salvo.',
    })
    globalThis.setTimeout(
      () => textareaRef.current?.focus(),
      0,
    )
  }

  async function handleEnviar() {
    if (revisaoOcr.pendente) {
      setAviso({
        tipo: 'erro',
        mensagem:
          'Confirme ou descarte a transcrição do OCR antes do envio.',
      })
      return
    }

    if (!texto.trim()) {
      setAviso({
        tipo: 'erro',
        mensagem: 'A redação precisa possuir um texto.',
      })
      textareaRef.current?.focus()
      return
    }

    if (
      !globalThis.confirm(
        'Enviar a redação definitivamente? Depois do envio, o texto não poderá ser alterado.',
      )
    ) {
      return
    }

    setAcao('enviar')
    setAviso(null)

    try {
      await salvarTexto(texto)
      const redacao = await enviarRedacao(temaId)

      ultimoTextoSalvoRef.current = redacao.texto
      setPagina((estado) => ({
        ...estado,
        redacao,
      }))
      setAviso({
        tipo: 'sucesso',
        mensagem:
          'Redação enviada. O professor já pode acessá-la para correção.',
      })
      globalThis.setTimeout(
        () => statusRef.current?.focus(),
        0,
      )
    } catch (error) {
      setAviso({
        tipo: 'erro',
        mensagem: interpretarErroApi(
          error,
          'Não foi possível enviar a redação.',
        ).mensagem,
      })
    } finally {
      setAcao(null)
    }
  }

  if (pagina.status === 'carregando') {
    return (
      <DashboardLayout>
        <div
          className="mx-auto max-w-5xl px-6 py-16"
          role="status"
        >
          <div className="h-8 w-56 animate-pulse rounded-lg bg-lexis-300/15" />
          <div className="mt-6 h-96 animate-pulse rounded-[14px] bg-lexis-300/10" />
          <span className="sr-only">
            Carregando tema e rascunho...
          </span>
        </div>
      </DashboardLayout>
    )
  }

  if (pagina.status === 'erro') {
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Link
            to="/aluno"
            className="text-sm font-semibold text-lexis-300 hover:text-white"
          >
            ← Voltar ao painel
          </Link>
          <div
            role="alert"
            className="mt-8 rounded-[14px] border border-red-400/30 bg-red-950/30 p-6 text-red-100"
          >
            {aviso?.mensagem}
          </div>
        </section>
      </DashboardLayout>
    )
  }

  const { tema, redacao } = pagina

  return (
    <DashboardLayout>
      <section className="border-b border-lexis-200/10 px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/aluno"
            className="text-sm font-semibold text-lexis-300 hover:text-white"
          >
            ← Voltar ao painel
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
            Produção de redação
          </p>
          <h1 className="mt-3 max-w-4xl font-editorial text-3xl font-semibold text-white sm:text-5xl">
            {tema.enunciado}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-lexis-200">
            {tema.descricao}
          </p>
          <dl className="mt-6 flex flex-wrap gap-3 text-sm text-lexis-100">
            <div className="rounded-full border border-lexis-200/15 px-4 py-2">
              <dt className="sr-only">Turma</dt>
              <dd>{tema.turma?.nome}</dd>
            </div>
            <div className="rounded-full border border-lexis-200/15 px-4 py-2">
              <dt className="sr-only">Prazo</dt>
              <dd>Prazo: {formatarData(tema.prazoEntrega)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            onSubmit={handleSalvar}
            className="surface-card rounded-[14px] p-5 sm:p-7"
            aria-busy={acao !== null}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Sua redação
                </h2>
                <p className="mt-1 text-sm text-lexis-200">
                  O rascunho é salvo no servidor e não é duplicado no armazenamento do navegador.
                </p>
              </div>
              <span className="rounded-full border border-lexis-200/15 px-3 py-1 text-xs font-semibold text-lexis-200">
                {redacao?.status === 'AVALIADA'
                  ? 'Corrigida'
                  : redacao?.status === 'ENVIADA'
                    ? 'Enviada'
                    : 'Rascunho'}
              </span>
            </div>

            <label
              htmlFor="texto-redacao"
              className="mt-7 block text-sm font-semibold text-white"
            >
              Texto da redação
            </label>
            <textarea
              ref={textareaRef}
              id="texto-redacao"
              value={texto}
              onChange={(evento) => {
                setTexto(evento.target.value)
                setAviso(null)
                setRevisaoLinguistica({
                  status: 'inicial',
                  disponivel: null,
                  sugestoes: [],
                  mensagem: '',
                })
                setSalvamento((estado) => ({
                  ...estado,
                  status: 'alterado',
                }))
              }}
              maxLength={LIMITE_CARACTERES_REDACAO}
              rows={20}
              readOnly={redacaoImutavel}
              aria-describedby="contador-redacao status-salvamento"
              className="mt-3 min-h-[28rem] w-full resize-y rounded-[10px] border border-lexis-200/20 bg-lexis-950/70 px-5 py-4 font-editorial text-[1.0625rem] leading-8 text-white outline-none transition focus:border-lexis-300 focus:ring-4 focus:ring-lexis-300/15 read-only:cursor-not-allowed read-only:opacity-80"
              placeholder="Comece a desenvolver sua redação..."
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <p
                id="status-salvamento"
                role={
                  salvamento.status === 'erro'
                    ? 'alert'
                    : 'status'
                }
                className={
                  salvamento.status === 'erro'
                    ? 'text-red-300'
                    : 'text-lexis-200'
                }
              >
                {mensagemSalvamento(
                  salvamento.status,
                  salvamento.salvoEm,
                )}
              </p>
              <output
                id="contador-redacao"
                htmlFor="texto-redacao"
                className="font-semibold text-lexis-200"
              >
                {texto.length.toLocaleString('pt-BR')} /{' '}
                {LIMITE_CARACTERES_REDACAO.toLocaleString('pt-BR')} caracteres
              </output>
            </div>

            {revisaoOcr.pendente && (
              <div className="mt-6 rounded-[10px] border border-amber-300/30 bg-amber-950/25 p-5">
                <h3 className="font-semibold text-amber-100">
                  Revisão do OCR obrigatória
                </h3>
                <p className="mt-2 text-sm leading-6 text-amber-100/85">
                  Confira e corrija o texto acima. Ele só substituirá o rascunho do servidor depois da confirmação.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmarOcr}
                    disabled={acao !== null}
                    className="min-h-11 rounded-[10px] bg-amber-300 px-4 font-bold text-amber-950 disabled:opacity-55"
                  >
                    {acao === 'revisao-ocr'
                      ? 'Confirmando...'
                      : 'Confirmar texto revisado'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRestaurarTexto}
                    disabled={acao !== null}
                    className="min-h-11 rounded-[10px] border border-amber-200/40 px-4 font-semibold text-amber-100 disabled:opacity-55"
                  >
                    Restaurar texto anterior
                  </button>
                </div>
              </div>
            )}

            {aviso && (
              <div
                ref={statusRef}
                tabIndex={-1}
                role={
                  aviso.tipo === 'erro'
                    ? 'alert'
                    : 'status'
                }
                className={`mt-6 rounded-[10px] border p-4 text-sm leading-6 outline-none focus:ring-4 focus:ring-lexis-300/20 ${
                  aviso.tipo === 'erro'
                    ? 'border-red-400/30 bg-red-950/30 text-red-100'
                    : 'border-emerald-400/30 bg-emerald-950/30 text-emerald-100'
                }`}
              >
                {aviso.mensagem}
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {!redacaoImutavel && (
                <>
                  <button
                    type="submit"
                    disabled={
                      acao !== null ||
                      revisaoOcr.pendente
                    }
                    className="min-h-12 rounded-[10px] border border-lexis-300/35 px-5 font-bold text-white disabled:opacity-55"
                  >
                    {acao === 'salvar'
                      ? 'Salvando...'
                      : 'Salvar agora'}
                  </button>
                  <button
                    type="button"
                    onClick={handleEnviar}
                    disabled={
                      acao !== null ||
                      revisaoOcr.pendente ||
                      !texto.trim()
                    }
                    className="min-h-12 rounded-[10px] bg-lexis-400 px-5 font-bold text-white disabled:opacity-55"
                  >
                    {acao === 'enviar'
                      ? 'Enviando...'
                      : 'Enviar definitivamente'}
                  </button>
                </>
              )}

              {redacao?.status === 'AVALIADA' && (
                <Link
                  to={`/aluno/redacoes/${redacao.id}/feedback`}
                  className="inline-flex min-h-12 items-center rounded-[10px] bg-lexis-400 px-5 font-bold text-white"
                >
                  Abrir correção
                </Link>
              )}
            </div>
          </form>

          <aside className="space-y-6">
            {!redacaoImutavel && (
              <section className="surface-card rounded-[14px] p-5">
                <h2 className="text-lg font-semibold text-white">
                  Digitalizar redação
                </h2>
                <p className="mt-2 text-sm leading-6 text-lexis-200">
                  Envie uma foto JPEG ou PNG de até 1 MB. O texto extraído ficará pendente até sua revisão explícita.
                </p>
                <label className="mt-5 block text-sm font-semibold text-white">
                  Imagem da redação
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(evento) => {
                      setImagem(
                        evento.target.files?.[0] ?? null,
                      )
                      setAviso(null)
                    }}
                    disabled={acao !== null}
                    className="mt-3 block w-full text-sm text-lexis-200 file:mr-3 file:rounded-lg file:border-0 file:bg-lexis-300/15 file:px-3 file:py-2 file:font-semibold file:text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleOcr}
                  disabled={
                    acao !== null ||
                    !imagem ||
                    revisaoOcr.pendente
                  }
                  className="mt-4 min-h-11 w-full rounded-[10px] bg-lexis-800 px-4 font-bold text-white disabled:opacity-55"
                >
                  {acao === 'ocr'
                    ? 'Processando imagem...'
                    : 'Extrair texto com OCR'}
                </button>

                {acao === 'ocr' && (
                  <div
                    className="mt-4"
                    role="status"
                    aria-live="polite"
                  >
                    <label
                      htmlFor="progresso-ocr"
                      className="text-xs font-semibold text-lexis-200"
                    >
                      Upload: {progressoOcr}%
                    </label>
                    <progress
                      id="progresso-ocr"
                      max="100"
                      value={progressoOcr}
                      className="mt-2 h-2 w-full accent-lexis-400"
                    />
                    <p className="mt-2 text-xs leading-5 text-lexis-200">
                      Após o upload, o OCR pode levar alguns segundos para analisar a imagem.
                    </p>
                  </div>
                )}
              </section>
            )}

            {!redacaoImutavel && (
              <section className="surface-card rounded-[14px] p-5">
                <h2 className="text-lg font-semibold text-white">
                  Revisão linguística opcional
                </h2>
                <p className="mt-2 text-sm leading-6 text-lexis-200">
                  A solicitação envia o texto atual ao LanguageTool configurado. O resultado é apenas uma sugestão e nunca bloqueia o salvamento ou o envio.
                </p>
                <button
                  type="button"
                  onClick={handleRevisarLinguagem}
                  disabled={
                    acao !== null ||
                    !texto.trim() ||
                    revisaoOcr.pendente
                  }
                  className="mt-4 min-h-11 w-full rounded-[10px] bg-lexis-800 px-4 font-bold text-white disabled:opacity-55"
                >
                  {acao === 'linguagem'
                    ? 'Revisando texto...'
                    : 'Solicitar revisão linguística'}
                </button>

                {revisaoLinguistica.status !== 'inicial' && (
                  <div
                    className="mt-4"
                    role={
                      revisaoLinguistica.status === 'erro'
                        ? 'alert'
                        : 'status'
                    }
                  >
                    <p className="text-sm leading-6 text-lexis-100">
                      {revisaoLinguistica.status === 'carregando'
                        ? 'Consultando o serviço configurado...'
                        : revisaoLinguistica.mensagem}
                    </p>
                    {revisaoLinguistica.sugestoes.length > 0 && (
                      <ol className="mt-4 space-y-3">
                        {revisaoLinguistica.sugestoes.map(
                          (sugestao) => (
                            <li
                              key={sugestao.id}
                              className="rounded-[10px] border border-lexis-200/15 bg-lexis-950/50 p-4"
                            >
                              <p className="text-sm font-semibold text-white">
                                <q>{sugestao.trecho}</q>
                              </p>
                              <p className="mt-2 text-xs leading-5 text-lexis-200">
                                {sugestao.mensagem}
                              </p>
                              {sugestao.substituicoes.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {sugestao.substituicoes.map(
                                    (substituicao) => (
                                      <button
                                        key={substituicao}
                                        type="button"
                                        onClick={() =>
                                          handleAplicarSugestao(
                                            sugestao,
                                            substituicao,
                                          )
                                        }
                                        className="min-h-10 rounded-lg border border-lexis-300/30 px-3 text-xs font-bold text-white"
                                      >
                                        Aplicar “{substituicao}”
                                      </button>
                                    ),
                                  )}
                                </div>
                              )}
                            </li>
                          ),
                        )}
                      </ol>
                    )}
                  </div>
                )}

                <a
                  href="https://languagetool.org"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-xs font-semibold text-lexis-300 underline underline-offset-4"
                >
                  Conheça o LanguageTool
                  <span className="sr-only">
                    {' '}(abre em nova aba)
                  </span>
                </a>
              </section>
            )}

            <section className="surface-card rounded-[14px] p-5">
              <h2 className="text-lg font-semibold text-white">
                Critérios aplicáveis
              </h2>
              {tema.instrucoes && (
                <p className="mt-3 text-sm leading-6 text-lexis-200">
                  {tema.instrucoes}
                </p>
              )}
              <ol className="mt-5 space-y-4">
                {tema.criterios.map((criterio) => (
                  <li
                    key={criterio.id}
                    className="border-t border-lexis-200/10 pt-4 first:border-0 first:pt-0"
                  >
                    <p className="text-sm font-semibold text-white">
                      {criterio.ordem}. {criterio.nome}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-lexis-200">
                      {criterio.descricao}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </section>
    </DashboardLayout>
  )
}
