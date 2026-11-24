import { formatarData } from '../../utils/formatar-data.js'
import Etiqueta from '../../components/base/Etiqueta.jsx'
import EstadoVazio from '../../components/base/EstadoVazio.jsx'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import Aviso from '../../components/base/Aviso.jsx'
import Botao from '../../components/base/Botao.jsx'
import Campo from '../../components/base/Campo.jsx'
import Dialogo from '../../components/base/Dialogo.jsx'
import DialogoConfirmacao from '../../components/base/DialogoConfirmacao.jsx'
import { AcaoExclusaoDefinitiva, ConfirmarExclusaoDefinitiva } from '../../components/professor/ExclusaoDefinitiva.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import AppShell from '../../layouts/AppShell.jsx'
import { listarRedacoesDaTurma } from '../../services/redacoes.js'
import { listarTemasDaTurma } from '../../services/temas.js'
import {
  arquivarTurma,
  desvincularAlunoDaTurma,
  excluirTurma,
  listarAlunosDaTurma,
  obterTurma,
  reabrirTurma,
  regenerarCodigoTurma,
  renomearTurma,
} from '../../services/turmas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import { prepararNomeTurma } from '../../utils/professor-classes.js'
import {
  descreverDialogoReabrirTurma,
  mapearErroReabertura,
  MENSAGENS_SUCESSO_REABERTURA,
} from '../../utils/reabertura.js'
import {
  contarEntregasPorTema,
  descreverResultadoDasPropostas,
  descreverResultadoDosAlunos,
  descreverSituacaoAluno,
  descreverSituacaoTurma,
  filtrarAlunosDaTurma,
  FILTROS_DE_PROPOSTA,
  obterStatusTema,
  ondeABuscaEncontrou,
  ordenarAlunosDaTurma,
  organizarPropostasDaTurma,
  resumirAlunosDaTurma,
} from '../../utils/professor-turma.js'
import { obterIniciais } from '../../utils/professor-dashboard.js'
import { IconeEngrenagem } from '../../components/base/icones.jsx'
import './professor-turmas.css'
import './professor-turma.css'

function RenomearTurmaDialog({ nomeAtual, enviando, erro, onSave, onClose }) {
  const nomeRef = useRef(null)
  const [nome, setNome] = useState(nomeAtual)
  const [erroCampo, setErroCampo] = useState('')

  useEffect(() => {
    if (!enviando && (erro || erroCampo)) nomeRef.current?.focus()
  }, [enviando, erro, erroCampo])

  function enviar(event) {
    event.preventDefault()
    if (enviando) return
    const preparado = prepararNomeTurma(nome)
    if (preparado.erro) {
      setErroCampo(preparado.erro)
      nomeRef.current?.focus()
      return
    }
    setErroCampo('')
    onSave(preparado.nome)
  }

  return (
    <Dialogo
      aberto
      onFechar={() => { if (!enviando) onClose() }}
      titulo="Renomear turma"
      descricao="O código de acesso, os alunos e os temas não mudam."
    >
      <form onSubmit={enviar} noValidate aria-busy={enviando} className="space-y-4">
        <Campo
          ref={nomeRef}
          id="turma-nome"
          label="Nome da turma"
          value={nome}
          maxLength={100}
          autoComplete="off"
          disabled={enviando}
          required
          error={erroCampo}
          hint="Entre 2 e 100 caracteres."
          onChange={(event) => { setNome(event.target.value); setErroCampo('') }}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <div className="dialogo-base__rodape">
          <Botao variante="secundario" disabled={enviando} onClick={onClose}>Cancelar</Botao>
          <Botao type="submit" carregando={enviando} rotuloCarregando="Salvando…">Salvar nome</Botao>
        </div>
      </form>
    </Dialogo>
  )
}

function ConfirmarAcaoDialog({ titulo, efeitos, rotulo, rotuloEnviando, enviando, erro, onConfirm, onClose, perigo = true }) {
  return (
    <DialogoConfirmacao
      aberto
      titulo={titulo}
      efeitos={efeitos}
      confirmarRotulo={enviando ? rotuloEnviando : rotulo}
      perigo={perigo}
      ocupado={enviando}
      onConfirmar={onConfirm}
      onCancelar={onClose}
    >
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </DialogoConfirmacao>
  )
}

/*
 * Issue #194: o cartão da proposta perdeu a descrição integral, que ocupava
 * dezenas de linhas na listagem e empurrava as outras propostas para fora da
 * tela. Fica o que serve para escolher: enunciado, situação, prazo e entregas.
 * O enunciado completo continua na página da proposta.
 */
function TemaCard({ tema, busca, entregas }) {
  const achado = ondeABuscaEncontrou(tema, busca)

  return (
    <li className="tema-card">
      <Link to={`/professor/temas/${tema.id}`} className="tema-card-link" aria-label={`Abrir proposta ${tema.enunciado}`}>
        <Etiqueta className="tema-card-status">{obterStatusTema(tema)}</Etiqueta>
        <h3>{tema.enunciado}</h3>
        <p className="tema-card-prazo">
          Prazo: {formatarData(tema.prazoEntrega, 'dataHora', { vazio: 'sem prazo definido' })}
        </p>
        <p className="tema-card-contagens">
          {entregas === undefined ? 'Carregando entregas…'
            : entregas === null ? 'Entregas indisponíveis'
              : `${entregas} ${entregas === 1 ? 'entrega' : 'entregas'}`}
        </p>
        {/* A busca olha dentro da descrição e das orientações, que o cartão não
            mostra: sem esta linha a proposta apareceria sem o termo à vista. */}
        {achado && <p className="tema-card-achado">{achado}</p>}
        <span className="tema-card-abrir" aria-hidden="true">Abrir ›</span>
      </Link>
    </li>
  )
}

// Desenhado aqui, e não em components/base/icones.jsx, para a mudança não sair
// das telas desta Issue. Os três pontos são cheios: de traço virariam anéis.
function IconeMaisAcoes() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  )
}

/*
 * Menu de ações do cartão do aluno (Issue #194). Mesmo padrão do menu do
 * usuário da casca: um botão com aria-expanded, Escape que fecha e devolve o
 * foco, e clique fora que fecha. Não declara o papel de menu da ARIA: sem
 * navegação por setas, seria uma promessa que a tela não cumpre.
 */
function MenuDoAluno({ nome, ocupado, onDesvincular }) {
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef(null)
  const painelRef = useRef(null)
  const idPainel = useId()

  useEffect(() => {
    if (!aberto) return undefined

    function fecharComEscape(evento) {
      if (evento.key === 'Escape') {
        setAberto(false)
        botaoRef.current?.focus()
      }
    }

    function fecharAoClicarFora(evento) {
      if (
        !painelRef.current?.contains(evento.target) &&
        !botaoRef.current?.contains(evento.target)
      ) {
        setAberto(false)
      }
    }

    document.addEventListener('keydown', fecharComEscape)
    document.addEventListener('pointerdown', fecharAoClicarFora)

    return () => {
      document.removeEventListener('keydown', fecharComEscape)
      document.removeEventListener('pointerdown', fecharAoClicarFora)
    }
  }, [aberto])

  return (
    <div className="aluno-card-menu">
      <button
        ref={botaoRef}
        type="button"
        className="aluno-card-menu-botao"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={`Ações de ${nome}`}
        onClick={() => setAberto((atual) => !atual)}
      >
        <IconeMaisAcoes />
      </button>

      {aberto && (
        <div ref={painelRef} id={idPainel} className="aluno-card-menu-painel">
          <button
            type="button"
            className="aluno-card-menu-item"
            disabled={ocupado}
            onClick={() => {
              /*
               * O foco volta ao botão do menu antes de o item sumir: o diálogo
               * guarda quem estava com o foco para devolvê-lo ao fechar, e um
               * item já desmontado devolveria o foco ao corpo da página.
               */
              botaoRef.current?.focus()
              setAberto(false)
              onDesvincular()
            }}
          >
            Desvincular da turma
          </button>
        </div>
      )}
    </div>
  )
}

/*
 * Issue #194: os alunos saíram da lista de linhas largas para uma grade de
 * cartões, com as ações recolhidas num menu por cartão. "Desvincular" continua
 * pedindo a mesma confirmação; o que mudou é que ele parou de competir com o
 * nome do aluno em todos os cartões ao mesmo tempo.
 */
function AlunoCard({ matricula, ocupado, onDesvincular }) {
  const estado = descreverSituacaoAluno(matricula)
  const nome = matricula.aluno?.nome ?? 'Aluno'

  return (
    <li className="aluno-card">
      <span aria-hidden="true" className="aluno-card-iniciais">{obterIniciais(nome)}</span>
      <div className="aluno-card-info">
        <strong>{nome}</strong>
        {/* Cabe uma linha só; o title devolve o endereço inteiro ao ponteiro,
            e o texto continua completo para o leitor de tela e para a busca. */}
        <span className="aluno-card-email" title={matricula.aluno?.email}>{matricula.aluno?.email}</span>
        <span>Entrou em {formatarData(matricula.iniciadaEm, 'data', { vazio: 'Data indisponível' })}</span>
        <span className={estado.atencao ? 'attention' : undefined}>{estado.rotulo}</span>
      </div>
      <MenuDoAluno nome={nome} ocupado={ocupado} onDesvincular={onDesvincular} />
    </li>
  )
}

export default function ProfessorTurmaPage() {
  const { turmaId } = useParams()
  const { usuario } = useAuth()
  return <ProfessorTurmaDetalhe key={`${usuario?.id}:${turmaId}`} turmaId={turmaId} />
}

function ProfessorTurmaDetalhe({ turmaId }) {
  const { state } = useLocation()
  const navigate = useNavigate()
  const telaAtual = useRef(null)
  useLayoutEffect(() => {
    telaAtual.current = {}
    return () => { telaAtual.current = null }
  }, [])
  const [parametros] = useSearchParams()
  const aba = parametros.get('aba') === 'alunos' ? 'alunos' : 'propostas'
  const [copiado, setCopiado] = useState(false)
  const codigoRef = useRef(null)
  const copiarTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(copiarTimerRef.current), [])

  function linkDaAba(destino) {
    const busca = new URLSearchParams(parametros)
    busca.set('aba', destino)
    return { search: busca.toString() }
  }

  const [pagina, setPagina] = useState({ status: 'carregando', turma: null, temas: [], mensagem: '' })
  const [tentativa, setTentativa] = useState(0)
  const [alunos, setAlunos] = useState({ status: 'carregando', lista: [], mensagem: '' })
  const [dialogo, setDialogo] = useState(null)
  const [buscaProposta, setBuscaProposta] = useState('')
  const [entregasPorTema, setEntregasPorTema] = useState(undefined)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [filtroProposta, setFiltroProposta] = useState('todas')
  const [acao, setAcao] = useState({ enviando: false, erro: '' })
  const [aviso, setAviso] = useState('')
  const acaoRef = useRef(false)
  const alunosTituloRef = useRef(null)
  const gestaoTituloRef = useRef(null)

  useEffect(() => {
    let ativo = true
    setPagina({ status: 'carregando', turma: null, temas: [], mensagem: '' })
    setAviso('')

    Promise.all([obterTurma(turmaId), listarTemasDaTurma(turmaId)])
      .then(([turma, temas]) => {
        if (ativo) setPagina({ status: 'pronto', turma, temas: Array.isArray(temas) ? temas : [], mensagem: '' })
      })
      .catch((error) => {
        if (ativo) {
          setPagina({
            status: 'erro',
            turma: null,
            temas: [],
            mensagem: interpretarErroApi(error, 'Não foi possível carregar esta turma.').mensagem,
          })
        }
      })

    return () => { ativo = false }
  }, [turmaId, tentativa])

  const turma = pagina.turma
  const situacao = descreverSituacaoTurma(turma)
  const pronto = pagina.status === 'pronto'
  const temPropostas = pagina.temas.length > 0
  useEffect(() => {
    if (!pronto || !temPropostas || aba !== 'propostas') return undefined
    let ativo = true
    setEntregasPorTema(undefined)
    // Uma consulta de metadados para a turma inteira. A contagem do tema
    // também inclui rascunhos e é preservada nas regras de exclusão.
    listarRedacoesDaTurma(turmaId)
      .then((redacoes) => { if (ativo) setEntregasPorTema(contarEntregasPorTema(redacoes)) })
      .catch(() => { if (ativo) setEntregasPorTema(null) })
    return () => { ativo = false }
  }, [aba, pronto, temPropostas, turmaId])
  const motivoExclusao = turma?.ativa ? 'Arquive a turma antes de excluí-la.'
    : turma?.podeExcluirDefinitivamente === false ? 'Esta turma tem matrículas ou propostas no histórico e não pode ser excluída.'
      : turma?.podeExcluirDefinitivamente !== true ? 'Ainda não foi possível verificar se a turma pode ser excluída.'
        : ''

  const carregarAlunos = useCallback(() => {
    // O backend exige turma ativa em GET /turmas/:id/alunos: numa turma
    // arquivada a chamada responde 409, então nem é feita.
    if (!pronto || !situacao.podeGerenciar) {
      setAlunos({ status: 'indisponivel', lista: [], mensagem: '' })
      return undefined
    }

    let ativo = true
    setAlunos({ status: 'carregando', lista: [], mensagem: '' })

    listarAlunosDaTurma(turmaId)
      .then((lista) => {
        if (ativo) setAlunos({ status: 'pronto', lista: ordenarAlunosDaTurma(lista), mensagem: '' })
      })
      .catch((error) => {
        if (ativo) {
          setAlunos({
            status: 'erro',
            lista: [],
            mensagem: interpretarErroApi(error, 'Não foi possível carregar os alunos desta turma.').mensagem,
          })
        }
      })

    return () => { ativo = false }
  }, [pronto, situacao.podeGerenciar, turmaId])

  useEffect(() => carregarAlunos(), [carregarAlunos])

  function fecharDialogo() {
    if (acaoRef.current) return
    setDialogo(null)
    setAcao({ enviando: false, erro: '' })
  }

  async function executar(operacao, aoConcluir) {
    if (acaoRef.current) return
    acaoRef.current = true
    setAcao({ enviando: true, erro: '' })
    try {
      const resultado = await operacao()
      acaoRef.current = false
      setDialogo(null)
      setAcao({ enviando: false, erro: '' })
      aoConcluir(resultado)
    } catch (error) {
      acaoRef.current = false
      setAcao({
        enviando: false,
        erro: interpretarErroApi(error, 'Não foi possível concluir. Tente novamente.').mensagem,
      })
    }
  }

  function renomear(nome) {
    executar(() => renomearTurma(turmaId, nome), (atualizada) => {
      setPagina((atual) => ({ ...atual, turma: atualizada }))
      setAviso(`Turma renomeada para “${atualizada.nome}”.`)
    })
  }

  function regenerar() {
    executar(() => regenerarCodigoTurma(turmaId), (atualizada) => {
      setPagina((atual) => ({ ...atual, turma: atualizada }))
      setAviso(`Novo código de acesso: ${atualizada.codigoAcesso}. O código anterior deixou de funcionar.`)
    })
  }

  function arquivar() {
    executar(() => arquivarTurma(turmaId), (atualizada) => {
      const tela = telaAtual.current
      setPagina((atual) => ({ ...atual, turma: atualizada }))
      setAlunos({ status: 'indisponivel', lista: [], mensagem: '' })
      setAviso('Turma arquivada. As matrículas ativas foram encerradas.')
      devolverFocoAGestao()
      obterTurma(turmaId).then((turmaAtual) => {
        if (tela === telaAtual.current) setPagina((atual) => ({ ...atual, turma: turmaAtual }))
      }).catch(() => {})
    })
  }

  async function excluir() {
    if (acaoRef.current || motivoExclusao) return
    const tela = telaAtual.current
    acaoRef.current = true
    setAcao({ enviando: true, erro: '' })
    try {
      await excluirTurma(turmaId)
      if (tela === telaAtual.current) navigate('/professor/turmas', { replace: true, state: { turmaExcluida: true } })
    } catch (error) {
      if (tela !== telaAtual.current) return
      const mensagem = interpretarErroApi(error, 'Não foi possível excluir a turma. Tente novamente.').mensagem
      if (error?.response?.status !== 409) {
        setAcao({ enviando: false, erro: mensagem })
        return
      }
      setPagina((atual) => ({ ...atual, turma: {
        ...atual.turma,
        podeExcluirDefinitivamente: error.response.data?.error?.code === 'CLASS_HAS_HISTORY' ? false : undefined,
      } }))
      setAcao({ enviando: false, erro: '' })
      setDialogo(null)
      setAviso(mensagem)
      devolverFocoAGestao()
      try {
        const [turmaAtual, temas] = await Promise.all([obterTurma(turmaId), listarTemasDaTurma(turmaId)])
        if (tela === telaAtual.current) setPagina({ status: 'pronto', turma: turmaAtual, temas, mensagem: '' })
      } catch {
        // O aviso e o bloqueio continuam visíveis mesmo se a atualização falhar.
      }
    } finally {
      acaoRef.current = false
    }
  }

  // O efeito roda depois da limpeza do diálogo, que devolve o foco ao botão que
  // o abriu (já trocado por outra ação): assim o foco termina no título da seção.
  const [focoGestao, setFocoGestao] = useState(0)
  const devolverFocoAGestao = () => setFocoGestao((valor) => valor + 1)

  useEffect(() => {
    if (focoGestao > 0) gestaoTituloRef.current?.focus()
  }, [focoGestao])

  async function reabrir() {
    if (acaoRef.current) return
    acaoRef.current = true
    setAcao({ enviando: true, erro: '' })
    try {
      const atualizada = await reabrirTurma(turmaId)
      acaoRef.current = false
      setPagina((atual) => ({ ...atual, turma: atualizada }))
      setDialogo(null)
      setAcao({ enviando: false, erro: '' })
      setAviso(MENSAGENS_SUCESSO_REABERTURA.turma)
      devolverFocoAGestao()
    } catch (error) {
      acaoRef.current = false
      const erroMapeado = mapearErroReabertura(error, 'turma')

      if (!erroMapeado.recarregar) {
        setAcao({ enviando: false, erro: erroMapeado.mensagem })
        return
      }

      // A turma já estava ativa: busca a situação atual antes de avisar.
      try {
        const [turmaAtual, temas] = await Promise.all([obterTurma(turmaId), listarTemasDaTurma(turmaId)])
        setPagina({ status: 'pronto', turma: turmaAtual, temas: Array.isArray(temas) ? temas : [], mensagem: '' })
      } catch {
        // Mantém a tela atual; o aviso abaixo explica o conflito.
      }
      setDialogo(null)
      setAcao({ enviando: false, erro: '' })
      setAviso(erroMapeado.mensagem)
      devolverFocoAGestao()
    }
  }

  function desvincular(matricula) {
    const nome = matricula.aluno?.nome ?? 'O aluno'
    executar(() => desvincularAlunoDaTurma(turmaId, matricula.aluno.id), () => {
      setAlunos((atual) => ({
        ...atual,
        lista: atual.lista.filter((item) => item.id !== matricula.id),
      }))
      setPagina((atual) => (atual.turma
        ? { ...atual, turma: { ...atual.turma, quantidadeAlunosAtivos: Math.max(0, (atual.turma.quantidadeAlunosAtivos ?? 1) - 1) } }
        : atual))
      setAviso(`${nome} foi desvinculado da turma.`)
      requestAnimationFrame(() => alunosTituloRef.current?.focus())
    })
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(turma.codigoAcesso)
      setAviso(`Código ${turma.codigoAcesso} copiado.`)
      setCopiado(true)
      clearTimeout(copiarTimerRef.current)
      copiarTimerRef.current = setTimeout(() => setCopiado(false), 2000)
    } catch {
      const selecao = document.getSelection()
      if (selecao && codigoRef.current) {
        const intervalo = document.createRange()
        intervalo.selectNodeContents(codigoRef.current)
        selecao.removeAllRanges()
        selecao.addRange(intervalo)
      }
      setAviso(`Não foi possível copiar automaticamente. Copie o código ${turma.codigoAcesso}.`)
    }
  }

  const resumo = resumirAlunosDaTurma(alunos.lista)
  const alunosVisiveis = filtrarAlunosDaTurma(alunos.lista, buscaAluno)
  const propostasVisiveis = organizarPropostasDaTurma(pagina.temas, {
    busca: buscaProposta,
    filtro: filtroProposta,
  })

  function limparFiltrosDePropostas() {
    setBuscaProposta('')
    setFiltroProposta('todas')
  }

  return (
    <AppShell conteudo="amplo" trilha={[{ rotulo: 'Turmas', para: '/professor/turmas' }, pronto ? turma.nome : 'Turma']}>
      <div
        className="panel-main turma-main"
        aria-busy={pagina.status === 'carregando'}
      >
        {pagina.status === 'carregando' && (
          <>
            <h1>Turma</h1>
            <p role="status" className="panel-subtitle">Carregando a turma…</p>
            <div className="panel-stats turma-stats" aria-hidden="true">
              {[0, 1, 2].map((item) => <div key={item} className="panel-stat skeleton-block" />)}
            </div>
            <ul className="turma-temas-grade" aria-hidden="true">
              {[0, 1, 2].map((item) => <li key={item} className="tema-card skeleton-block" />)}
            </ul>
          </>
        )}

        {pagina.status === 'erro' && (
          <>
            <h1>Turma</h1>
            <section className="panel-error" role="alert">
              <h2>Não foi possível abrir a turma</h2>
              <p>{pagina.mensagem}</p>
              <div className="turma-acoes">
                <Botao type="button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</Botao>
                <Botao as={Link} variante="secundario" to="/professor/turmas">Voltar às turmas</Botao>
              </div>
            </section>
          </>
        )}

        {pronto && (
          <>
            <div className="turma-heading">
              <div>
                <h1>{turma.nome}</h1>
                <p className="panel-subtitle">
                  Acompanhe as propostas, entregas e matrículas.
                </p>
              </div>
              <div className="turma-heading-acoes">
                {situacao.podeGerenciar && (
                  <Botao type="button" variante="secundario" ref={gestaoTituloRef}
                    onClick={() => setDialogo({ tipo: 'gerenciar' })}>
                    <IconeEngrenagem />Gerenciar
                  </Botao>
                )}
                {situacao.ativa && (
                  <Botao as={Link} to={`/professor/turmas/${turmaId}/temas/novo`} className="turma-create">
                    Nova proposta
                  </Botao>
                )}
              </div>
            </div>

            <p role="status" className="turma-aviso">{aviso || (state?.propostaExcluida ? 'Proposta excluída definitivamente.' : '')}</p>

            <div className="turma-contexto">
              <span>Código de acesso: <strong ref={codigoRef}>{turma.codigoAcesso}</strong></span>
              <Botao type="button" variante="secundario" onClick={copiarCodigo}>
                {copiado ? 'Copiado' : 'Copiar'}
              </Botao>
            </div>
            {!situacao.podeGerenciar && (
                <section className="turma-arquivada" aria-labelledby="turma-gestao-title">
                  <h2 id="turma-gestao-title" ref={gestaoTituloRef} tabIndex={-1}>Turma arquivada</h2>
                  <p>
                    Esta turma está arquivada desde {formatarData(turma.arquivadaEm, 'data', { vazio: 'Data indisponível' })}. As matrículas
                    foram encerradas e a turma não pode ser alterada enquanto estiver arquivada. As redações
                    e as correções continuam disponíveis.
                  </p>
                  <div className="turma-acoes">
                    <Botao type="button" onClick={() => setDialogo({ tipo: 'reabrir' })}>Reabrir turma</Botao>
                    <AcaoExclusaoDefinitiva motivo={motivoExclusao} idMotivo="turma-motivo-exclusao"
                      ocupado={acao.enviando} onAbrir={() => setDialogo({ tipo: 'excluir' })} />
                  </div>
                </section>
            )}
            <nav className="turma-abas" aria-label="Seções da turma">
              <Link to={linkDaAba('propostas')} aria-current={aba === 'propostas' ? 'page' : undefined}>Propostas</Link>
              <Link to={linkDaAba('alunos')} aria-current={aba === 'alunos' ? 'page' : undefined}>Alunos ({turma.quantidadeAlunosAtivos ?? 0})</Link>
            </nav>

            {aba === 'alunos' && <section className="panel-attention turma-alunos" aria-labelledby="turma-alunos-title">
              <h2 id="turma-alunos-title" ref={alunosTituloRef} tabIndex={-1}>Alunos da turma</h2>
              <p>
                {alunos.status === 'pronto'
                  ? `${resumo.rotulo}${resumo.desativados ? ` · ${resumo.desativados} com conta desativada` : ''}`
                  : 'Alunos com matrícula ativa nesta turma.'}
              </p>

              {alunos.status === 'carregando' && (
                <ul className="turma-alunos-grade" role="status" aria-label="Carregando alunos">
                  {[0, 1, 2].map((item) => <li key={item} className="aluno-card skeleton-block" aria-hidden="true" />)}
                </ul>
              )}

              {alunos.status === 'erro' && (
                <div className="panel-error" role="alert">
                  <h3>Não foi possível carregar os alunos</h3>
                  <p>{alunos.mensagem}</p>
                  <Botao type="button" onClick={carregarAlunos}>Tentar novamente</Botao>
                </div>
              )}

              {alunos.status === 'indisponivel' && (
                <EstadoVazio
                  nivel={3}
                  titulo="Lista indisponível em turma arquivada"
                  descricao="As matrículas foram encerradas no arquivamento."
                />
              )}

              {alunos.status === 'pronto' && alunos.lista.length > 0 && (
                <div className="classes-toolbar turma-alunos-toolbar">
                  <label className="classes-search"><span className="sr-only">Buscar aluno por nome ou e-mail</span>
                    <input type="search" className="class-input" placeholder="Buscar aluno por nome ou e-mail…"
                      value={buscaAluno} onChange={(evento) => setBuscaAluno(evento.target.value)} />
                  </label>
                </div>
              )}

              {alunos.status === 'pronto' && (alunos.lista.length ? (alunosVisiveis.length ? (
                <>
                  <p role="status" className="turma-temas-resultado">
                    {descreverResultadoDosAlunos(alunosVisiveis.length, alunos.lista.length)}
                  </p>
                  <ul className="turma-alunos-grade">
                    {alunosVisiveis.map((matricula) => (
                      <AlunoCard
                        key={matricula.id}
                        matricula={matricula}
                        ocupado={acao.enviando}
                        onDesvincular={() => setDialogo({ tipo: 'desvincular', matricula })}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <EstadoVazio
                  nivel={3}
                  titulo="Nenhum aluno nesta busca"
                  descricao="Tente outra parte do nome ou do e-mail."
                  acao={<Botao type="button" variante="secundario" onClick={() => setBuscaAluno('')}>Limpar busca</Botao>}
                />
              )) : (
                <EstadoVazio
                  nivel={3}
                  titulo="Nenhum aluno nesta turma"
                  descricao={<>Compartilhe o código <strong className="codigo-turma">{turma.codigoAcesso}</strong> para os alunos entrarem.</>}
                />
              ))}
            </section>}

            {aba === 'propostas' && <section className="panel-attention turma-temas" aria-labelledby="turma-temas-title">
              <h2 id="turma-temas-title">Propostas da turma</h2>
              <p>Acompanhe os prazos e a quantidade de redações recebidas em cada proposta.</p>
              {pagina.temas.length > 0 && (
                <div className="classes-toolbar turma-temas-toolbar">
                  <label className="classes-search"><span className="sr-only">Buscar proposta por enunciado, descrição ou orientações</span>
                    <input type="search" className="class-input" placeholder="Buscar por enunciado, descrição ou orientações…"
                      value={buscaProposta} onChange={(evento) => setBuscaProposta(evento.target.value)} />
                  </label>
                  <div className="classes-filters" role="group" aria-label="Filtrar propostas por situação">
                    {FILTROS_DE_PROPOSTA.map(([valor, rotulo]) => (
                      <button key={valor} type="button" aria-pressed={filtroProposta === valor}
                        onClick={() => setFiltroProposta(valor)}>{rotulo}</button>
                    ))}
                  </div>
                </div>
              )}
              {pagina.temas.length === 0 ? (
                <EstadoVazio nivel={3} titulo="Esta turma ainda não possui propostas de redação." />
              ) : propostasVisiveis.length ? (
                <>
                  <p role="status" className="turma-temas-resultado">
                    {descreverResultadoDasPropostas(propostasVisiveis.length, pagina.temas.length)}
                  </p>
                  <ul className="turma-temas-grade">
                    {propostasVisiveis.map((tema) => (
                      <TemaCard key={tema.id} tema={tema} busca={buscaProposta}
                        entregas={entregasPorTema ? (entregasPorTema.get(tema.id) ?? 0) : entregasPorTema} />
                    ))}
                  </ul>
                </>
              ) : (
                <EstadoVazio
                  nivel={3}
                  titulo="Nenhuma proposta nesta busca"
                  descricao="A busca já olha o enunciado, a descrição e as orientações. Tente outro trecho ou outro filtro."
                  acao={<Botao type="button" variante="secundario" onClick={limparFiltrosDePropostas}>Limpar filtros</Botao>}
                />
              )}
            </section>}

            {dialogo?.tipo === 'gerenciar' && (
              <Dialogo
                aberto
                titulo="Gerenciar turma"
                descricao="Escolha o que deseja fazer. Cada ação pede uma confirmação antes de valer."
                resumo={<p className="turma-gerenciar-resumo"><strong>{turma.nome}</strong><span>Código de acesso: {turma.codigoAcesso}</span></p>}
                onFechar={fecharDialogo}
                rodape={<Botao type="button" variante="secundario" onClick={fecharDialogo}>Fechar</Botao>}
                rodapeSeparado
              >
                <div className="turma-gerenciar-acoes">
                  <Botao type="button" variante="secundario" onClick={() => setDialogo({ tipo: 'renomear' })}>Renomear turma</Botao>
                  <Botao type="button" variante="secundario" onClick={() => setDialogo({ tipo: 'regenerar' })}>Gerar novo código</Botao>
                  <Botao type="button" variante="perigo" onClick={() => setDialogo({ tipo: 'arquivar' })}>Arquivar turma</Botao>
                  <AcaoExclusaoDefinitiva motivo={motivoExclusao} idMotivo="turma-motivo-exclusao" />
                </div>
              </Dialogo>
            )}

            {dialogo?.tipo === 'renomear' && (
              <RenomearTurmaDialog
                nomeAtual={turma.nome}
                enviando={acao.enviando}
                erro={acao.erro}
                onSave={renomear}
                onClose={fecharDialogo}
              />
            )}

            {dialogo?.tipo === 'regenerar' && (
              <ConfirmarAcaoDialog
                titulo="Gerar um novo código de acesso?"
                efeitos={[
                  'O código atual deixa de funcionar imediatamente.',
                  'Quem já está matriculado continua na turma.',
                  'Alunos que ainda não entraram precisarão do código novo.',
                ]}
                rotulo="Gerar novo código"
                rotuloEnviando="Gerando…"
                enviando={acao.enviando}
                erro={acao.erro}
                onConfirm={regenerar}
                onClose={fecharDialogo}
              />
            )}

            {dialogo?.tipo === 'arquivar' && (
              <ConfirmarAcaoDialog
                titulo={`Arquivar a turma “${turma.nome}”?`}
                efeitos={[
                  'As matrículas de todos os alunos são encerradas.',
                  'Cada aluno com matrícula ativa recebe um aviso dentro do LÉXIS, sem e-mail.',
                  'Os alunos deixam de ver as propostas desta turma e não podem enviar redações.',
                  'As redações e as correções já publicadas continuam disponíveis.',
                  'A turma continua na sua lista, marcada como arquivada, e só poderá ser alterada de novo se você reabri-la.',
                ]}
                rotulo="Arquivar turma"
                rotuloEnviando="Arquivando…"
                enviando={acao.enviando}
                erro={acao.erro}
                onConfirm={arquivar}
                onClose={fecharDialogo}
              />
            )}

            {dialogo?.tipo === 'reabrir' && (
              <ConfirmarAcaoDialog
                {...descreverDialogoReabrirTurma(turma)}
                perigo={false}
                enviando={acao.enviando}
                erro={acao.erro}
                onConfirm={reabrir}
                onClose={fecharDialogo}
              />
            )}

            {dialogo?.tipo === 'excluir' && <ConfirmarExclusaoDefinitiva tipo="turma" nome={turma.nome}
              ocupado={acao.enviando} erro={acao.erro} onConfirmar={excluir} onCancelar={fecharDialogo} />}

            {dialogo?.tipo === 'desvincular' && (
              <ConfirmarAcaoDialog
                titulo={`Desvincular ${dialogo.matricula.aluno?.nome ?? 'o aluno'} da turma?`}
                efeitos={[
                  'A matrícula é encerrada e o aluno deixa de ver as propostas desta turma.',
                  'As redações já enviadas e as correções publicadas permanecem.',
                  'O aluno recebe um aviso dentro do LÉXIS, sem e-mail.',
                  'Ele pode voltar depois com o código de acesso ou entrar em outra turma.',
                ]}
                rotulo="Desvincular aluno"
                rotuloEnviando="Desvinculando…"
                enviando={acao.enviando}
                erro={acao.erro}
                onConfirm={() => desvincular(dialogo.matricula)}
                onClose={fecharDialogo}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
