import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link, useParams } from 'react-router'

import ConferenciaEnvioCard from '../../components/aluno/ConferenciaEnvioCard.jsx'
import ConfirmarEnvioDialogo from '../../components/aluno/ConfirmarEnvioDialogo.jsx'
import EnvioFotoPainel from '../../components/aluno/EnvioFotoPainel.jsx'
import RevisaoLinguisticaCard from '../../components/aluno/RevisaoLinguisticaCard.jsx'
import AlunoLayout from '../../layouts/AlunoLayout.jsx'
import {
  confirmarRevisaoOcr,
  enviarRedacao,
  listarMinhasRedacoes,
  revisarLinguagemRedacao,
  salvarRascunho,
  transcreverImagemRedacao,
} from '../../services/redacoes.js'
import { obterTemaDoAluno } from '../../services/temas.js'
import { formatarDiaMes } from '../../utils/aluno-painel.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import {
  aplicarSugestaoLinguistica,
  descreverExtensao,
  encontrarRedacaoPorTema,
  formatarHorario,
  formatarPrazoCurto,
  ITENS_CONFERENCIA_ENVIO,
  LIMITE_CARACTERES_REDACAO,
  mensagemRevisaoLinguistica,
  precisaConfirmarSubstituicaoOcr,
  validarImagemRedacao,
} from '../../utils/essay-editor.js'

const INTERVALO_AUTOSAVE_MS = 1_500
const LIMIAR_AVISO_CARACTERES = 18_000

const ABAS = [
  {
    id: 'digitar',
    rotulo: 'Digitar redação',
  },
  {
    id: 'foto',
    rotulo: 'Enviar foto (OCR)',
  },
]

const REVISAO_LINGUISTICA_INICIAL = {
  status: 'inicial',
  disponivel: null,
  sugestoes: [],
  mensagem: '',
}

const classeCartao =
  'aluno-elevacao-1 rounded-xl border border-[var(--surface-border)] bg-lexis-900'

function descreverEntrega(redacao) {
  const dia = formatarDiaMes(redacao?.enviadaEm)
  const horario = formatarHorario(redacao?.enviadaEm)

  return dia && horario
    ? `Enviada em ${dia} às ${horario}`
    : 'Redação enviada'
}

function AbasModoEnvio({
  abaAtiva,
  onSelecionar,
}) {
  const abasRef = useRef({})

  function handleKeyDown(evento, indice) {
    const destinos = {
      ArrowRight: (indice + 1) % ABAS.length,
      ArrowLeft: (indice - 1 + ABAS.length) % ABAS.length,
      Home: 0,
      End: ABAS.length - 1,
    }
    const proximo = destinos[evento.key]

    if (proximo === undefined) return

    evento.preventDefault()
    onSelecionar(ABAS[proximo].id)
    abasRef.current[ABAS[proximo].id]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Forma de envio da redação"
      className="flex w-full rounded-lg bg-[var(--aluno-trilho)] p-1 sm:w-auto"
    >
      {ABAS.map((aba, indice) => {
        const ativa = aba.id === abaAtiva

        return (
          <button
            key={aba.id}
            ref={(elemento) => {
              abasRef.current[aba.id] = elemento
            }}
            type="button"
            role="tab"
            id={`aba-${aba.id}`}
            aria-selected={ativa}
            aria-controls={`painel-${aba.id}`}
            tabIndex={ativa ? 0 : -1}
            onClick={() => onSelecionar(aba.id)}
            onKeyDown={(evento) =>
              handleKeyDown(evento, indice)
            }
            className={`h-9 flex-1 rounded-md px-3 text-[13px] font-semibold leading-[18px] transition-colors sm:w-[164px] sm:flex-none ${
              ativa
                ? 'bg-lexis-900 text-[var(--aluno-acao-suave-texto)] shadow-[0_1px_2px_rgba(0,32,73,0.08)]'
                : 'text-lexis-200 hover:text-lexis-50'
            }`}
          >
            {aba.rotulo}
          </button>
        )
      })}
    </div>
  )
}

function IndicadorSalvamento({
  salvamento,
  podeSalvar,
  onSalvarAgora,
}) {
  const horario = formatarHorario(salvamento.salvoEm)
  const estados = {
    salvando: {
      texto: 'Salvando...',
      classe:
        'bg-[var(--aluno-neutro-fundo)] text-lexis-200',
    },
    alterado: {
      texto: 'Alterações ainda não salvas',
      classe:
        'bg-[var(--aluno-neutro-fundo)] text-lexis-200',
    },
    erro: {
      texto: 'Não foi possível salvar',
      classe:
        'bg-[var(--aluno-neutro-fundo)] text-[var(--aluno-erro)]',
    },
  }
  const estado =
    estados[salvamento.status] ??
    (horario
      ? {
          texto: `Salvo no servidor às ${horario}`,
          classe:
            'bg-[var(--aluno-sucesso-fundo)] text-[var(--aluno-sucesso)]',
        }
      : {
          texto: 'Salvamento automático ativo',
          classe:
            'bg-[var(--aluno-neutro-fundo)] text-lexis-200',
        })

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p
        id="status-salvamento"
        role={
          salvamento.status === 'erro'
            ? 'alert'
            : 'status'
        }
        className={`inline-flex h-6 items-center rounded-full px-3 text-xs font-medium leading-[17px] ${estado.classe}`}
      >
        {estado.texto}
      </p>
      <button
        type="button"
        onClick={onSalvarAgora}
        disabled={!podeSalvar}
        className="text-xs font-semibold leading-[17px] text-[var(--aluno-acao-suave-texto)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-0"
      >
        {salvamento.status === 'erro'
          ? 'Tentar de novo'
          : 'Salvar agora'}
      </button>
    </div>
  )
}

function EditorCard({
  texto,
  textareaRef,
  somenteLeitura,
  onAlterarTexto,
  revisaoOcrPendente,
  rodape,
  blocoRevisaoOcr,
}) {
  const extensao = descreverExtensao(texto)
  const proximoDoLimite =
    texto.length >= LIMIAR_AVISO_CARACTERES

  return (
    <section
      aria-labelledby="titulo-editor"
      className={`${classeCartao} flex min-h-[500px] flex-col px-6 pb-[14px] pt-4`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--surface-border)] pb-2">
        <h2
          id="titulo-editor"
          className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50"
        >
          Sua redação
        </h2>
        <p
          id="contagem-redacao"
          className="text-xs font-medium leading-[17px] text-lexis-200"
        >
          {extensao}
          {proximoDoLimite &&
            ` · ${texto.length.toLocaleString('pt-BR')}/${LIMITE_CARACTERES_REDACAO.toLocaleString('pt-BR')} caracteres`}
        </p>
      </div>

      <label
        htmlFor="texto-redacao"
        className="sr-only"
      >
        Texto da redação
      </label>
      <textarea
        ref={textareaRef}
        id="texto-redacao"
        value={texto}
        onChange={(evento) =>
          onAlterarTexto(evento.target.value)
        }
        maxLength={LIMITE_CARACTERES_REDACAO}
        readOnly={somenteLeitura}
        aria-describedby="contagem-redacao status-salvamento"
        placeholder="Comece a desenvolver sua redação..."
        className="font-editorial mt-[17px] min-h-[348px] w-full flex-1 resize-none bg-transparent text-[17px] leading-8 text-lexis-100 outline-none placeholder:text-lexis-200 read-only:cursor-default"
      />

      {revisaoOcrPendente && blocoRevisaoOcr}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--surface-border)] pt-[9px]">
        {rodape}
      </div>
    </section>
  )
}

function BlocoRevisaoOcr({
  ocupado,
  confirmando,
  onConfirmar,
  onRestaurar,
}) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-lg bg-[var(--aluno-atencao-fundo)] py-3 pl-4 pr-4">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] bg-[var(--aluno-atencao)]"
      />
      <h3 className="text-[13px] font-semibold leading-[18px] text-[var(--aluno-atencao)]">
        Revise o texto transcrito
      </h3>
      <p className="mt-1 text-xs font-medium leading-[17px] text-lexis-100">
        A transcrição automática pode conter erros. Confira e corrija o texto acima; ele só substitui o rascunho do servidor depois da sua confirmação.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          className="h-9 rounded-lg bg-[var(--color-brand-accent)] px-4 text-[13px] font-semibold leading-[18px] text-[#ffffff] disabled:opacity-55"
        >
          {confirmando
            ? 'Confirmando...'
            : 'Confirmar texto revisado'}
        </button>
        <button
          type="button"
          onClick={onRestaurar}
          disabled={ocupado}
          className="h-9 rounded-lg border border-[var(--aluno-borda-campo)] bg-lexis-900 px-4 text-[13px] font-semibold leading-[18px] text-lexis-100 disabled:opacity-55"
        >
          Restaurar texto anterior
        </button>
      </div>
    </div>
  )
}

function CartaoEntrega({ redacao }) {
  const avaliada = redacao.status === 'AVALIADA'

  return (
    <section
      aria-labelledby="titulo-entrega"
      className={`${classeCartao} px-5 pb-5 pt-4`}
    >
      <h2
        id="titulo-entrega"
        className="aluno-titulo-interface text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50"
      >
        Entrega
      </h2>
      <dl className="mt-3 space-y-3 text-sm leading-[22px]">
        <div>
          <dt className="text-xs font-medium leading-[17px] text-lexis-200">
            Situação
          </dt>
          <dd className="text-lexis-100">
            {avaliada
              ? 'Corrigida pelo professor'
              : 'Em correção'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium leading-[17px] text-lexis-200">
            Formato
          </dt>
          <dd className="text-lexis-100">
            {redacao.origemTexto === 'OCR'
              ? 'Foto transcrita e revisada'
              : 'Texto digitado'}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs font-medium leading-[17px] text-lexis-200">
        O texto entregue não pode mais ser editado.
      </p>
    </section>
  )
}

function EsqueletoEditor() {
  return (
    <div
      role="status"
      className="animate-pulse"
    >
      <span className="sr-only">
        Carregando o tema e o rascunho...
      </span>
      <div className="h-[41px] w-72 max-w-full rounded bg-lexis-800" />
      <div className="mt-[19px] h-16 rounded-lg bg-lexis-800" />
      <div className="mt-5 h-11 w-[340px] max-w-full rounded-lg bg-lexis-800" />
      <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_404px]">
        <div className="h-[500px] rounded-xl bg-lexis-800" />
        <div className="flex flex-col gap-4">
          <div className="h-[232px] rounded-xl bg-lexis-800" />
          <div className="h-[252px] rounded-xl bg-lexis-800" />
        </div>
      </div>
    </div>
  )
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
  const [abaAtiva, setAbaAtiva] = useState('digitar')
  const [imagem, setImagem] = useState(null)
  const [progressoOcr, setProgressoOcr] =
    useState(0)
  const [revisaoOcr, setRevisaoOcr] = useState({
    pendente: false,
    textoAnterior: '',
  })
  const [revisaoLinguistica, setRevisaoLinguistica] =
    useState(REVISAO_LINGUISTICA_INICIAL)
  const [conferencia, setConferencia] = useState({})
  const [propostaAberta, setPropostaAberta] =
    useState(false)
  const [dialogoEnvioAberto, setDialogoEnvioAberto] =
    useState(false)

  const textoAtualRef = useRef('')
  const ultimoTextoSalvoRef = useRef('')
  const textareaRef = useRef(null)
  const statusRef = useRef(null)
  const botaoEnviarRef = useRef(null)

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

  function handleAlterarTexto(novoTexto) {
    setTexto(novoTexto)
    setAviso(null)
    setRevisaoLinguistica(REVISAO_LINGUISTICA_INICIAL)
    setSalvamento((estado) => ({
      ...estado,
      status: 'alterado',
    }))
  }

  async function handleSalvar() {
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
      setRevisaoLinguistica(
        REVISAO_LINGUISTICA_INICIAL,
      )
      setRevisaoOcr({
        pendente: true,
        textoAnterior,
      })
      setSalvamento((estado) => ({
        ...estado,
        status: 'alterado',
      }))
      setAbaAtiva('digitar')
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
      setImagem(null)
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
        status: revisao.disponivel ? 'pronto' : 'indisponivel',
        disponivel: revisao.disponivel,
        sugestoes: revisao.sugestoes ?? [],
        mensagem: mensagemRevisaoLinguistica(revisao),
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
    setRevisaoLinguistica(REVISAO_LINGUISTICA_INICIAL)
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
    setRevisaoLinguistica(REVISAO_LINGUISTICA_INICIAL)
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

  function handleRevisarEEnviar() {
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

    setDialogoEnvioAberto(true)
  }

  function handleCancelarEnvio() {
    setDialogoEnvioAberto(false)
    globalThis.setTimeout(
      () => botaoEnviarRef.current?.focus(),
      0,
    )
  }

  async function handleConfirmarEnvio() {
    setDialogoEnvioAberto(false)
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

  const rotaEditor = `/aluno/temas/${encodeURIComponent(temaId)}/redacao`

  if (pagina.status === 'carregando') {
    return (
      <AlunoLayout
        rotaEnviarRedacao={rotaEditor}
        trilha={['Enviar redação']}
      >
        <EsqueletoEditor />
      </AlunoLayout>
    )
  }

  if (pagina.status === 'erro') {
    return (
      <AlunoLayout
        rotaEnviarRedacao={rotaEditor}
        trilha={['Enviar redação']}
      >
        <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50">
          Escrever redação
        </h1>
        <div
          role="alert"
          className={`${classeCartao} mt-[19px] max-w-[700px] p-6`}
        >
          <h2 className="aluno-titulo-interface text-lg font-semibold leading-6 text-lexis-50">
            Não foi possível abrir o editor
          </h2>
          <p className="mt-2 text-sm leading-[22px] text-lexis-200">
            {aviso?.mensagem}
          </p>
          <Link
            to="/aluno"
            className="mt-4 inline-flex h-10 items-center rounded-lg border border-[var(--aluno-borda-campo)] px-4 text-[13px] font-semibold text-lexis-100"
          >
            Voltar ao início
          </Link>
        </div>
      </AlunoLayout>
    )
  }

  const { tema, redacao } = pagina
  const ocupado = acao !== null
  const pendentesConferencia =
    ITENS_CONFERENCIA_ENVIO.filter(
      (item) => !conferencia[item.id],
    )

  const rodapeEditor = redacaoImutavel ? (
    <>
      <p
        id="status-salvamento"
        className="inline-flex h-6 items-center rounded-full bg-[var(--aluno-neutro-fundo)] px-3 text-xs font-medium leading-[17px] text-lexis-200"
      >
        {descreverEntrega(redacao)}
      </p>
      {redacao.status === 'AVALIADA' ? (
        <Link
          to={`/aluno/redacoes/${encodeURIComponent(redacao.id)}/feedback`}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--color-brand-accent)] px-5 text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110 sm:w-[160px]"
        >
          Ver feedback
        </Link>
      ) : (
        <p className="text-xs font-medium leading-[17px] text-lexis-200">
          Aguardando a correção do professor.
        </p>
      )}
    </>
  ) : (
    <>
      <IndicadorSalvamento
        salvamento={salvamento}
        podeSalvar={
          !ocupado &&
          !revisaoOcr.pendente &&
          Boolean(texto.trim()) &&
          texto !== ultimoTextoSalvoRef.current
        }
        onSalvarAgora={handleSalvar}
      />
      <button
        ref={botaoEnviarRef}
        type="button"
        onClick={handleRevisarEEnviar}
        disabled={
          ocupado ||
          revisaoOcr.pendente ||
          !texto.trim()
        }
        className="h-11 w-full rounded-lg bg-[var(--color-brand-accent)] px-5 text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 sm:w-[160px]"
      >
        {acao === 'enviar'
          ? 'Enviando...'
          : 'Revisar e enviar'}
      </button>
    </>
  )

  const editor = (
    <EditorCard
      texto={texto}
      textareaRef={textareaRef}
      somenteLeitura={Boolean(redacaoImutavel)}
      onAlterarTexto={handleAlterarTexto}
      revisaoOcrPendente={revisaoOcr.pendente}
      blocoRevisaoOcr={
        <BlocoRevisaoOcr
          ocupado={ocupado}
          confirmando={acao === 'revisao-ocr'}
          onConfirmar={handleConfirmarOcr}
          onRestaurar={handleRestaurarTexto}
        />
      }
      rodape={rodapeEditor}
    />
  )

  return (
    <AlunoLayout
      rotaEnviarRedacao={rotaEditor}
      trilha={['Enviar redação', tema.enunciado]}
    >
      <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50">
        {redacaoImutavel
          ? 'Redação entregue'
          : 'Escrever redação'}
      </h1>

      <section
        aria-labelledby="rotulo-tema"
        className="mt-[19px] rounded-lg border border-[var(--color-brand-accent)] bg-[var(--aluno-acao-suave)] px-[19px] pb-2 pt-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <div className="min-w-0">
            <p
              id="rotulo-tema"
              className="text-[11px] font-bold uppercase leading-[14px] tracking-[1.32px] text-[var(--aluno-acao-suave-texto)]"
            >
              Tema da proposta
            </p>
            <p className="mt-1.5 text-lg font-semibold leading-6 tracking-[-0.09px] text-lexis-50">
              {tema.enunciado}
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-[13px] font-semibold leading-[18px] text-lexis-100">
              Entrega até {formatarPrazoCurto(tema.prazoEntrega)}
            </p>
            <button
              type="button"
              aria-expanded={propostaAberta}
              aria-controls="proposta-completa"
              onClick={() =>
                setPropostaAberta((atual) => !atual)
              }
              className="text-xs font-semibold leading-[17px] text-[var(--aluno-acao-suave-texto)] underline-offset-4 hover:underline"
            >
              {propostaAberta
                ? 'Ocultar proposta completa'
                : 'Ver proposta completa'}
            </button>
          </div>
        </div>

        {propostaAberta && (
          <div
            id="proposta-completa"
            className="mt-2 space-y-3 border-t border-[var(--color-brand-accent)]/30 pb-2 pt-3 text-sm leading-[22px] text-lexis-100"
          >
            <p>{tema.descricao}</p>
            {tema.instrucoes && (
              <p className="text-lexis-200">
                {tema.instrucoes}
              </p>
            )}
            {tema.criterios?.length > 0 && (
              <div>
                <p className="text-xs font-semibold leading-[17px] text-lexis-50">
                  Critérios da Competência II
                </p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs leading-[17px] text-lexis-200">
                  {tema.criterios.map((criterio) => (
                    <li key={criterio.id}>
                      <span className="font-semibold text-lexis-100">
                        {criterio.nome}:
                      </span>{' '}
                      {criterio.descricao}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>

      {!redacaoImutavel && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <AbasModoEnvio
            abaAtiva={abaAtiva}
            onSelecionar={setAbaAtiva}
          />
          <p className="text-xs font-medium leading-[17px] text-lexis-200">
            Fotografou a redação no papel? Use a segunda aba — o LÉXIS transcreve.
          </p>
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
          className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium leading-[22px] outline-none ${
            aviso.tipo === 'erro'
              ? 'bg-[var(--aluno-neutro-fundo)] text-[var(--aluno-erro)]'
              : 'bg-[var(--aluno-sucesso-fundo)] text-[var(--aluno-sucesso)]'
          }`}
        >
          {aviso.mensagem}
        </div>
      )}

      <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_404px]">
        {redacaoImutavel ? (
          editor
        ) : (
          <div>
            <div
              role="tabpanel"
              id="painel-digitar"
              aria-labelledby="aba-digitar"
              hidden={abaAtiva !== 'digitar'}
            >
              {editor}
            </div>
            <div
              role="tabpanel"
              id="painel-foto"
              aria-labelledby="aba-foto"
              hidden={abaAtiva !== 'foto'}
            >
              <EnvioFotoPainel
                imagem={imagem}
                enviando={acao === 'ocr'}
                progresso={progressoOcr}
                desabilitado={
                  ocupado || revisaoOcr.pendente
                }
                motivoBloqueio={
                  revisaoOcr.pendente
                    ? 'Há uma transcrição aguardando revisão na aba “Digitar redação”. Confirme ou restaure o texto antes de enviar outra foto.'
                    : null
                }
                onSelecionar={(arquivo) => {
                  setImagem(arquivo)
                  setAviso(null)
                }}
                onExtrair={handleOcr}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {redacaoImutavel ? (
            <CartaoEntrega redacao={redacao} />
          ) : (
            <>
              <RevisaoLinguisticaCard
                estado={revisaoLinguistica}
                desabilitado={
                  ocupado ||
                  revisaoOcr.pendente ||
                  !texto.trim()
                }
                onRevisar={handleRevisarLinguagem}
                onAplicar={handleAplicarSugestao}
              />
              <ConferenciaEnvioCard
                marcados={conferencia}
                onAlternar={(id) =>
                  setConferencia((atual) => ({
                    ...atual,
                    [id]: !atual[id],
                  }))
                }
              />
            </>
          )}
        </div>
      </div>

      {!redacaoImutavel && (
        <ConfirmarEnvioDialogo
          aberto={dialogoEnvioAberto}
          extensao={descreverExtensao(texto)}
          pendentes={pendentesConferencia}
          onCancelar={handleCancelarEnvio}
          onConfirmar={handleConfirmarEnvio}
        />
      )}
    </AlunoLayout>
  )
}
