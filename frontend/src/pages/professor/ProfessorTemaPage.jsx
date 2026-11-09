import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router'
import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import CriterionDialog from '../../components/professor/CriterionDialog.jsx'
import { carregarPropostaProfessor } from '../../services/professor-topic.js'
import { arquivarTema, atualizarTema, reabrirTema, substituirCriterios } from '../../services/temas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import {
  agruparCriteriosProposta,
  descreverEdicaoTema,
  formatarPrazoParaInput,
  prepararCriterioPersonalizado,
  prepararEdicaoTema,
} from '../../utils/professor-topic.js'
import { obterIniciais } from '../../utils/professor-dashboard.js'
import {
  descreverDialogoReabrirProposta,
  descreverReabertura,
  mapearErroReabertura,
  MENSAGENS_SUCESSO_REABERTURA,
} from '../../utils/reabertura.js'
import './professor-topic.css'

function formatarPrazo(valor) {
  const data = new Date(valor)
  return valor && !Number.isNaN(data.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data)
    : 'Prazo não informado'
}

// Mesmo padrão do NovaTurmaDialog: dialog nativo, Esc tratado e foco devolvido.
function useDialogoProposta(onClose, enviando) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return {
    dialogRef,
    cancelar: (event) => { event.preventDefault(); if (!enviando) onClose() },
  }
}

function EditarPropostaDialog({ tema, enviando, erro, erros, onSave, onClose }) {
  const { dialogRef, cancelar } = useDialogoProposta(onClose, enviando)
  const primeiroRef = useRef(null)
  const bloqueio = descreverEdicaoTema(tema)
  const [formulario, setFormulario] = useState({
    enunciado: tema.enunciado,
    descricao: tema.descricao,
    instrucoes: tema.instrucoes ?? '',
    prazoEntrega: formatarPrazoParaInput(tema.prazoEntrega),
  })

  useEffect(() => {
    if (!enviando && Object.keys(erros).length) primeiroRef.current?.focus()
  }, [enviando, erros])

  const alterar = (campo) => (event) =>
    setFormulario((atual) => ({ ...atual, [campo]: event.target.value }))

  const campo = (nome, rotulo, elemento) => (
    <p className="topic-campo">
      <label htmlFor={`tema-${nome}`}>{rotulo}</label>
      {elemento}
      {erros[nome] && <span id={`tema-${nome}-erro`} className="topic-campo-erro">{erros[nome]}</span>}
    </p>
  )

  const comuns = (nome) => ({
    id: `tema-${nome}`,
    value: formulario[nome],
    disabled: enviando || (bloqueio.conteudoBloqueado && nome !== 'prazoEntrega'),
    onChange: alterar(nome),
    'aria-invalid': erros[nome] ? true : undefined,
    'aria-describedby': erros[nome] ? `tema-${nome}-erro` : undefined,
  })

  return (
    <dialog ref={dialogRef} className="professor-panel-dialog topic-proposta-dialog topic-edit-dialog" aria-labelledby="tema-editar-title" onCancel={cancelar}>
      <h2 id="tema-editar-title">Editar proposta</h2>
      {bloqueio.conteudoBloqueado && <p className="topic-rule">{bloqueio.motivo}</p>}
      <form
        noValidate
        aria-busy={enviando}
        onSubmit={(event) => { event.preventDefault(); if (!enviando) onSave(formulario) }}
      >
        {campo('enunciado', 'Enunciado', <input ref={primeiroRef} type="text" maxLength={250} {...comuns('enunciado')} />)}
        {campo('descricao', 'Descrição', <textarea rows={4} maxLength={10000} {...comuns('descricao')} />)}
        {campo('instrucoes', 'Orientações e textos motivadores', <textarea rows={3} maxLength={5000} {...comuns('instrucoes')} />)}
        {campo('prazoEntrega', 'Prazo de entrega', <input type="datetime-local" {...comuns('prazoEntrega')} />)}
        {(erros.formulario || erro) && <p className="topic-campo-erro" role="alert">{erros.formulario || erro}</p>}
        <div className="panel-dialog-actions">
          <button type="button" className="panel-soft-button" disabled={enviando} onClick={onClose}>Cancelar</button>
          <button type="submit" className="panel-primary-button" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar proposta'}</button>
        </div>
      </form>
    </dialog>
  )
}

function ArquivarPropostaDialog({ tema, enviando, erro, onConfirm, onClose }) {
  const { dialogRef, cancelar } = useDialogoProposta(onClose, enviando)

  return (
    <dialog ref={dialogRef} className="professor-panel-dialog topic-proposta-dialog" aria-labelledby="tema-arquivar-title" aria-describedby="tema-arquivar-efeitos" onCancel={cancelar}>
      <h2 id="tema-arquivar-title">Arquivar a proposta “{tema.enunciado}”?</h2>
      <ul id="tema-arquivar-efeitos" className="topic-efeitos">
        <li>A proposta sai da lista dos alunos e ninguém mais consegue abri-la nem enviar redação.</li>
        <li>As redações já enviadas e as correções publicadas permanecem.</li>
        <li>A proposta continua visível para você, marcada como arquivada.</li>
        <li>Depois de arquivada, a proposta só volta a ficar ativa se você reabri-la nesta página.</li>
      </ul>
      {erro && <p className="topic-campo-erro" role="alert">{erro}</p>}
      <div className="panel-dialog-actions">
        <button type="button" className="panel-soft-button" disabled={enviando} onClick={onClose}>Cancelar</button>
        <button type="button" className="panel-primary-button topic-botao-perigo" disabled={enviando} onClick={onConfirm}>
          {enviando ? 'Arquivando...' : 'Arquivar proposta'}
        </button>
      </div>
    </dialog>
  )
}

function ReabrirPropostaDialog({ tema, enviando, erro, onConfirm, onClose }) {
  const { dialogRef, cancelar } = useDialogoProposta(onClose, enviando)
  const { titulo, efeitos, rotulo, rotuloEnviando } = descreverDialogoReabrirProposta(tema)

  return (
    <dialog ref={dialogRef} className="professor-panel-dialog topic-proposta-dialog" aria-labelledby="tema-reabrir-title" aria-describedby="tema-reabrir-efeitos" onCancel={cancelar}>
      <h2 id="tema-reabrir-title">{titulo}</h2>
      <ul id="tema-reabrir-efeitos" className="topic-efeitos">
        {efeitos.map((efeito) => <li key={efeito}>{efeito}</li>)}
      </ul>
      {erro && <p className="topic-campo-erro" role="alert">{erro}</p>}
      <div className="panel-dialog-actions">
        <button type="button" className="panel-soft-button" disabled={enviando} onClick={onClose}>Cancelar</button>
        <button type="button" className="panel-primary-button" disabled={enviando} onClick={onConfirm}>
          {enviando ? rotuloEnviando : rotulo}
        </button>
      </div>
    </dialog>
  )
}

export default function ProfessorTemaPage() {
  const { temaId } = useParams()
  const [pagina, setPagina] = useState({ status: 'carregando' })
  const [tentativa, setTentativa] = useState(0)
  const [todas, setTodas] = useState(false)
  const [editor, setEditor] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erroEditor, setErroEditor] = useState('')
  const [aviso, setAviso] = useState('')
  const [proposta, setProposta] = useState(null)
  const [acaoProposta, setAcaoProposta] = useState({ enviando: false, erro: '', erros: {} })
  const acaoPropostaRef = useRef(false)
  const origemProposta = useRef(null)
  const salvandoRef = useRef(false)
  const origemEditor = useRef(null)
  const criteriosRef = useRef(null)
  const editarRef = useRef(null)
  // O botão Reabrir é trocado por Arquivar no mesmo lugar. O efeito roda depois da
  // limpeza do diálogo e leva o foco a Editar proposta, não a uma ação destrutiva.
  const [focoEditar, setFocoEditar] = useState(0)
  const redacoesRef = useRef(null)

  useEffect(() => {
    let ativo = true
    setPagina({ status: 'carregando' })
    setEditor(null); setTodas(false); setAviso(''); setErroEditor('')
    carregarPropostaProfessor(temaId).then((dados) => {
      if (ativo) setPagina({ status: 'pronto', ...dados })
    }).catch((error) => {
      if (ativo) setPagina({ status: 'erro', mensagem: error?.response?.data?.error?.message ?? 'Não foi possível carregar a proposta. Tente novamente.' })
    })
    return () => { ativo = false }
  }, [temaId, tentativa])

  useEffect(() => {
    if (focoEditar === 0) return
    const alvo = editarRef.current
    if (alvo?.isConnected && !alvo.disabled) alvo.focus()
    else criteriosRef.current?.focus()
  }, [focoEditar])

  const pronto = pagina.status === 'pronto'
  const grupos = pronto ? agruparCriteriosProposta(pagina.tema.criterios, pagina.modelo) : null
  const podeEditar = pronto && grupos.compativel && !pagina.tema.criteriosBloqueados && pagina.tema.ativo && pagina.turma.ativa
  const edicao = descreverEdicaoTema(pronto ? pagina.tema : null)
  const turmaId = pagina.turma?.id
  const reabertura = descreverReabertura({
    tipo: 'proposta',
    arquivada: pronto && !pagina.tema.ativo,
    turmaAtiva: pronto && pagina.turma.ativa,
  })

  function abrirEditor(indice, event) {
    origemEditor.current = event.currentTarget
    setEditor({ indice }); setErroEditor(''); setAviso('')
  }
  function fecharEditor() {
    setEditor(null); setErroEditor('')
    requestAnimationFrame(() => {
      const origem = origemEditor.current
      if (origem?.isConnected && !origem.disabled) origem.focus()
      else criteriosRef.current?.focus()
    })
  }
  async function salvarCriterio(novo) {
    if (salvandoRef.current || !podeEditar) return
    const preparado = prepararCriterioPersonalizado(pagina.tema.criterios, pagina.modelo, editor.indice, novo)
    if (preparado.erro) { setErroEditor(preparado.erro); return }
    salvandoRef.current = true; setSalvando(true); setErroEditor('')
    try {
      const tema = await substituirCriterios(temaId, preparado.criterios)
      setPagina((atual) => ({ ...atual, tema }))
      fecharEditor(); setAviso('Critério personalizado salvo.')
    } catch (error) {
      setErroEditor(error?.response?.data?.error?.message ?? 'Não foi possível salvar. Tente novamente.')
      // Revalida o bloqueio caso uma entrega tenha ocorrido durante a edição.
      if (error?.response?.status === 409) setTentativa((atual) => atual + 1)
    } finally { salvandoRef.current = false; setSalvando(false) }
  }
  function abrirProposta(tipo, event) {
    origemProposta.current = event.currentTarget
    setProposta(tipo)
    setAcaoProposta({ enviando: false, erro: '', erros: {} })
    setAviso('')
  }

  function fecharProposta() {
    if (acaoPropostaRef.current) return
    setProposta(null)
    setAcaoProposta({ enviando: false, erro: '', erros: {} })
    requestAnimationFrame(() => {
      const origem = origemProposta.current
      if (origem?.isConnected && !origem.disabled) origem.focus()
      else criteriosRef.current?.focus()
    })
  }

  async function executarProposta(operacao, mensagem) {
    if (acaoPropostaRef.current) return
    acaoPropostaRef.current = true
    setAcaoProposta({ enviando: true, erro: '', erros: {} })
    try {
      const tema = await operacao()
      acaoPropostaRef.current = false
      setPagina((atual) => ({ ...atual, tema }))
      setProposta(null)
      setAcaoProposta({ enviando: false, erro: '', erros: {} })
      setAviso(mensagem(tema))
      requestAnimationFrame(() => {
        const origem = origemProposta.current
        if (origem?.isConnected && !origem.disabled) origem.focus()
        else criteriosRef.current?.focus()
      })
    } catch (error) {
      acaoPropostaRef.current = false
      setAcaoProposta({
        enviando: false,
        erro: interpretarErroApi(error, 'Não foi possível concluir. Tente novamente.').mensagem,
        erros: {},
      })
      // Revalida o bloqueio caso uma entrega tenha ocorrido durante a edição.
      if (error?.response?.status === 409) setTentativa((atual) => atual + 1)
    }
  }

  function salvarProposta(formulario) {
    const { erros, dados } = prepararEdicaoTema(formulario, pagina.tema)
    if (!dados) {
      setAcaoProposta({ enviando: false, erro: '', erros })
      return
    }
    executarProposta(() => atualizarTema(temaId, dados), () => 'Proposta atualizada.')
  }

  function arquivarProposta() {
    executarProposta(() => arquivarTema(temaId), () => 'Proposta arquivada. Os alunos não a veem mais.')
  }

  async function reabrirProposta() {
    if (acaoPropostaRef.current) return
    acaoPropostaRef.current = true
    setAcaoProposta({ enviando: true, erro: '', erros: {} })
    const devolverFoco = () => setFocoEditar((valor) => valor + 1)

    try {
      const tema = await reabrirTema(temaId)
      acaoPropostaRef.current = false
      setPagina((atual) => ({ ...atual, tema }))
      setProposta(null)
      setAcaoProposta({ enviando: false, erro: '', erros: {} })
      setAviso(MENSAGENS_SUCESSO_REABERTURA.proposta)
      devolverFoco()
    } catch (error) {
      acaoPropostaRef.current = false
      const erroMapeado = mapearErroReabertura(error, 'proposta')

      if (!erroMapeado.recarregar) {
        setAcaoProposta({ enviando: false, erro: erroMapeado.mensagem, erros: {} })
        return
      }

      // Conflito de estado (já ativa ou turma arquivada): busca a situação atual
      // sem recarregar a página inteira, para o aviso continuar visível.
      try {
        const dados = await carregarPropostaProfessor(temaId)
        setPagina({ status: 'pronto', ...dados })
      } catch {
        // Mantém a tela atual; o aviso abaixo explica o conflito.
      }
      setProposta(null)
      setAcaoProposta({ enviando: false, erro: '', erros: {} })
      setAviso(erroMapeado.mensagem)
      devolverFoco()
    }
  }

  function irParaRedacoes() {
    redacoesRef.current?.scrollIntoView({ block: 'start' })
    redacoesRef.current?.focus()
  }

  return (
    <ProfessorWorkspaceLayout secao="Propostas" pronto={pronto} turmas={pronto ? [pagina.turma] : []} onRedacoes={irParaRedacoes}
      cabecalho={pronto ? <nav className="topic-breadcrumb" aria-label="Caminho da proposta"><Link to="/professor/turmas">Turmas</Link><span aria-hidden="true">›</span><Link to={`/professor/turmas/${turmaId}`} title={pagina.turma.nome}>{pagina.turma.nome}</Link><span aria-hidden="true">›</span><span>Proposta</span></nav> : undefined}>
      <motion.main id="panel-main" className="panel-main topic-main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }} aria-busy={pagina.status === 'carregando'}>
        {pagina.status === 'carregando' && <><h1>Proposta e critérios</h1><p role="status" className="panel-subtitle">Carregando proposta…</p><div className="topic-loading" aria-hidden="true"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div></>}
        {pagina.status === 'erro' && <><h1>Proposta e critérios</h1><section className="panel-error" role="alert"><h2>Não foi possível abrir a proposta</h2><p>{pagina.mensagem}</p><button className="panel-primary-button" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button><Link className="panel-soft-button" to="/professor/turmas">Voltar às turmas</Link></section></>}
        {pronto && <>
          <h1>{pagina.tema.enunciado}</h1>
          <p className="panel-subtitle topic-subtitle">{pagina.turma.nome} <span aria-hidden="true"> · </span> entrega até {formatarPrazo(pagina.tema.prazoEntrega)} <span aria-hidden="true"> · </span> {pagina.alunos} de {pagina.turma.quantidadeAlunosAtivos} alunos entregaram{!pagina.tema.ativo && ' · Proposta arquivada'}</p>
          <section className="topic-tabs" aria-labelledby="topic-tabs-title">
            <h2 id="topic-tabs-title">Temas</h2>
            <nav aria-label="Temas desta turma">{pagina.temas.map((tema) => <Link key={tema.id} to={`/professor/temas/${tema.id}`} title={tema.enunciado} aria-current={tema.id === temaId ? 'page' : undefined} aria-disabled={salvando || undefined} onClick={(event) => { if (salvando) event.preventDefault() }}>{tema.enunciado}</Link>)}</nav>
            {pagina.turma.ativa ? <Link className="panel-primary-button" to={`/professor/turmas/${turmaId}/temas/novo`}>+ Novo tema</Link> : <button className="panel-primary-button" disabled>Turma arquivada</button>}
          </section>
          <div className="topic-grid">
            <section className="topic-card topic-prompt" aria-labelledby="topic-prompt-title">
              <div className="topic-section-heading">
                <h2 id="topic-prompt-title">Enunciado</h2>
                <div className="topic-acoes">
                  <button ref={editarRef} type="button" className="panel-soft-button" disabled={!edicao.podeEditar || salvando} onClick={(event) => abrirProposta('editar', event)}>Editar proposta</button>
                  {reabertura.oferecer
                    ? <button type="button" className="panel-primary-button" disabled={salvando} onClick={(event) => abrirProposta('reabrir', event)}>Reabrir proposta</button>
                    : <button type="button" className="panel-soft-button topic-botao-perigo" disabled={!pagina.tema.ativo || salvando} onClick={(event) => abrirProposta('arquivar', event)}>Arquivar proposta</button>}
                </div>
              </div>
              {edicao.motivo && <p className="topic-rule">{edicao.motivo}</p>}
              {reabertura.bloqueada && (
                <div className="topic-rule">
                  <p>{reabertura.motivo}</p>
                  <Link className="panel-soft-button topic-rule-link" to={`/professor/turmas/${turmaId}`}>Ir para a turma e reabri-la</Link>
                </div>
              )}
              <p className="topic-prose">{pagina.tema.descricao}</p>
              <h3>Orientações e textos motivadores</h3>
              {pagina.tema.instrucoes ? <p className="topic-instructions">{pagina.tema.instrucoes}</p> : <p className="topic-empty-text">Nenhuma orientação adicional cadastrada nesta proposta.</p>}
            </section>
            <section className="topic-card topic-received" aria-labelledby="topic-received-title">
              <div className="topic-section-heading"><div><h2 ref={redacoesRef} tabIndex={-1} id="topic-received-title">Redações recebidas</h2><p>{pagina.alunos} de {pagina.turma.quantidadeAlunosAtivos} alunos entregaram</p></div>
                {pagina.redacoes.length > 3 && <button type="button" className="panel-soft-button" onClick={() => setTodas(!todas)} aria-expanded={todas} aria-controls="topic-essays">{todas ? 'Mostrar menos' : 'Ver todas'}</button>}
              </div>
              {pagina.redacoes.length ? <ul className="topic-essays" id="topic-essays">{(todas ? pagina.redacoes : pagina.redacoes.slice(0, 3)).map((redacao) => <li key={redacao.id}><Link to={`/professor/redacoes/${redacao.id}`}>
                <span className="panel-student-avatar" aria-hidden="true">{obterIniciais(redacao.aluno?.nome)}</span><span className="topic-student-name">{redacao.aluno?.nome ?? 'Aluno'}</span>
                <span className={`topic-status ${redacao.status === 'ENVIADA' ? 'pending' : 'corrected'}`}>{redacao.status === 'ENVIADA' ? 'Aguardando correção' : redacao.publicacao ? `Publicada${Number.isFinite(redacao.publicacao.nota) ? ` · ${redacao.publicacao.nota}/1000` : ''}` : 'Corrigida · nota indisponível'}</span>
              </Link></li>)}</ul> : <div className="topic-empty"><h3>Nenhuma redação recebida</h3><p>As redações aparecem aqui após o envio dos alunos.</p></div>}
            </section>
            <aside className="topic-card topic-criteria" aria-labelledby="topic-criteria-title">
              <h2 ref={criteriosRef} tabIndex={-1} id="topic-criteria-title">Critérios da Competência II</h2>
              <h3 className="topic-eyebrow">Base · fixos do LÉXIS</h3>
              <ul className="topic-criteria-list">{grupos.base.map((criterio, indice) => <li key={criterio.nome} className={`topic-criterion tone-${indice}`}><div><h4>{criterio.nome}</h4><span>fixo{!criterio.sincronizado && ' · não cadastrado'}</span></div><p>{criterio.descricao}</p></li>)}</ul>
              <h3 className="topic-eyebrow">Personalizados desta proposta</h3>
              {grupos.personalizados.length ? <ul className="topic-criteria-list">{grupos.personalizados.map((criterio, indice) => <li key={criterio.id ?? criterio.nome} className={`topic-criterion custom tone-${3 + indice % 2}`}><div><h4>{criterio.nome}</h4><button type="button" disabled={!podeEditar || salvando || Boolean(editor)} onClick={(event) => abrirEditor(indice, event)} aria-label={`Editar critério ${criterio.nome}`}>Editar</button></div><p>{criterio.descricao}</p></li>)}</ul> : <p className="topic-empty-text">Nenhum critério personalizado adicionado.</p>}
              <button type="button" className="panel-soft-button topic-add" disabled={!podeEditar || grupos.personalizados.length >= 2 || salvando || Boolean(editor)} onClick={(event) => abrirEditor(null, event)}>+ Adicionar critério personalizado</button>
              <p className="topic-limit">Até dois critérios personalizados nesta proposta. Aprovação administrativa prevista para uma etapa futura.</p>
              {pagina.tema.criteriosBloqueados && <p className="topic-rule">Critérios bloqueados após a primeira entrega, para preservar a avaliação da turma.</p>}
              {!grupos.compativel && <p className="topic-rule">Esta proposta usa uma configuração anterior. Os dados foram preservados; a edição exige adequação futura.</p>}
              {editor && <CriterionDialog key={editor.indice ?? 'novo'} proposta={pagina.tema.enunciado} inicial={editor.indice === null ? null : grupos.personalizados[editor.indice]} salvando={salvando} erro={erroEditor} onSave={salvarCriterio} onCancel={fecharEditor} />}
              <p role="status" className="topic-save-status">{aviso}</p>
            </aside>
          </div>

          {proposta === 'editar' && (
            <EditarPropostaDialog
              tema={pagina.tema}
              enviando={acaoProposta.enviando}
              erro={acaoProposta.erro}
              erros={acaoProposta.erros}
              onSave={salvarProposta}
              onClose={fecharProposta}
            />
          )}

          {proposta === 'reabrir' && (
            <ReabrirPropostaDialog
              tema={pagina.tema}
              enviando={acaoProposta.enviando}
              erro={acaoProposta.erro}
              onConfirm={reabrirProposta}
              onClose={fecharProposta}
            />
          )}

          {proposta === 'arquivar' && (
            <ArquivarPropostaDialog
              tema={pagina.tema}
              enviando={acaoProposta.enviando}
              erro={acaoProposta.erro}
              onConfirm={arquivarProposta}
              onClose={fecharProposta}
            />
          )}
        </>}
      </motion.main>
    </ProfessorWorkspaceLayout>
  )
}
