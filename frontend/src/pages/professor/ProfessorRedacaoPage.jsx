import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate, useParams } from 'react-router'
import AnalysisPanel from '../../components/correction/AnalysisPanel.jsx'
import EssayEvidenceText from '../../components/correction/EssayEvidenceText.jsx'
import FeedbackEditor from '../../components/correction/FeedbackEditor.jsx'
import CriterionComments from '../../components/correction/CriterionComments.jsx'
import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRascunho } from '../../hooks/useRascunho.js'
import { listarAnalisesIa, solicitarAnaliseIa } from '../../services/analises-ia.js'
import { obterFeedbackProfessor, publicarFeedback, salvarRascunhoFeedback } from '../../services/feedbacks.js'
import { listarRedacoesDaTurma, obterRedacaoProfessor } from '../../services/redacoes.js'
import { criarChaveRascunho } from '../../utils/draft-storage.js'
import { obterIniciais } from '../../utils/professor-dashboard.js'
import { avisoEstadoAnalise } from '../../utils/external-request.js'
import { criarFormularioFeedback, montarDadosFeedback, validarFeedback, criterioFixo, tomCriterio, evidenciasVerificadas, organizarFila, atualizarComentario } from '../../utils/professor-correction.js'
import fixedIcon from '../../assets/criterion-fixed.svg'
import './professor-correction.css'

const erroApi = (error, fallback) => error?.response?.data?.error?.message ?? fallback
const formVazio = { competencia1: '', competencia2: '', competencia3: '', competencia4: '', competencia5: '', legacyScore: '', generalComment: '', criterionComments: {}, criterionReviewed: {} }
const formatarData = (valor) => valor && !Number.isNaN(new Date(valor).getTime()) ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor)) : 'Não informada'

export default function ProfessorRedacaoPage() {
  const { redacaoId } = useParams()
  const { usuario } = useAuth()
  // Ao trocar de redação, nenhum estado ou resposta tardia pode atravessar para outro aluno.
  return <Correcao key={`${usuario?.id}:${redacaoId}`} redacaoId={redacaoId} usuarioId={usuario?.id} />
}

function Correcao({ redacaoId, usuarioId }) {
  const navigate = useNavigate()
  const [pagina, setPagina] = useState({ status: 'carregando', analises: [], fila: null })
  const [tentativa, setTentativa] = useState(0)
  const [form, setForm] = useState(formVazio)
  const [formServidor, setFormServidor] = useState(null)
  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [feedbackAction, setFeedbackAction] = useState(null)
  const [analysisNotice, setAnalysisNotice] = useState(null)
  const [feedbackNotice, setFeedbackNotice] = useState(null)
  const [painelAtivo, setPainelAtivo] = useState('criterios')
  const [mobile, setMobile] = useState(() => globalThis.matchMedia('(max-width: 767px)').matches)
  const [sheetAberto, setSheetAberto] = useState(false)
  const sheetRef = useRef(null)
  const focoCriterio = useRef(null)
  const ativo = useRef(true)
  const operacao = useRef(false)
  const analiseEmCurso = useRef(false)
  const rascunho = useRascunho({
    chave: criarChaveRascunho(usuarioId, redacaoId),
    habilitado: pagina.status === 'pronto',
    valorAtual: form,
  })
  const rascunhoDivergente = Boolean(rascunho.recuperado && formServidor && JSON.stringify(rascunho.recuperado.valor) !== JSON.stringify(formServidor))

  useEffect(() => {
    ativo.current = true
    return () => { ativo.current = false }
  }, [])
  useEffect(() => {
    const consulta = globalThis.matchMedia('(max-width: 767px)')
    const atualizar = () => { setMobile(consulta.matches); if (!consulta.matches) setSheetAberto(false) }
    consulta.addEventListener('change', atualizar)
    return () => consulta.removeEventListener('change', atualizar)
  }, [])
  useEffect(() => {
    let valido = true
    setPagina({ status: 'carregando', analises: [], fila: null })
    Promise.all([obterRedacaoProfessor(redacaoId), listarAnalisesIa(redacaoId), obterFeedbackProfessor(redacaoId)])
      .then(([redacao, analises, feedback]) => {
        if (!valido) return
        const formulario = criarFormularioFeedback(redacao, feedback)
        setForm(formulario); setFormServidor(formulario)
        setPagina({ status: 'pronto', redacao, analises, feedback, fila: null })
        listarRedacoesDaTurma(redacao.tema.turma.id, { temaId: redacao.tema.id })
          .then((lista) => { if (valido) setPagina((p) => ({ ...p, fila: organizarFila(lista, redacaoId) })) })
          .catch(() => { if (valido) setPagina((p) => ({ ...p, erroFila: true })) })
      }).catch((error) => {
        if (valido) setPagina({ status: 'erro', mensagem: erroApi(error, 'Não foi possível abrir esta redação.') })
      })
    return () => { valido = false }
  }, [redacaoId, tentativa])

  useEffect(() => {
    if (!mobile || !sheetAberto) return undefined
    const dialog = sheetRef.current
    const anterior = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => { dialog.close(); document.body.style.overflow = overflow; if (anterior?.isConnected) anterior.focus() }
  }, [mobile, sheetAberto])

  useEffect(() => {
    const ordem = focoCriterio.current
    if (ordem == null || painelAtivo !== 'comentarios' || (mobile && !sheetAberto)) return
    const elemento = document.getElementById(`review-criterion-${ordem}`)
    elemento?.scrollIntoView({ block: 'nearest' })
    elemento?.focus()
    focoCriterio.current = null
  }, [painelAtivo, sheetAberto, mobile])

  function mudarCampo(campo, valor) {
    if (!operacao.current) setForm((f) => ({ ...f, [campo]: valor }))
  }
  function mudarCriterio(id, valor) {
    if (!operacao.current) setForm((f) => atualizarComentario(f, id, valor))
  }
  function recuperarRascunho() {
    const recuperado = rascunho.recuperar()
    if (!recuperado) return
    // Mantém somente campos e critérios da redação atual, sem importar texto da redação.
    setForm((f) => ({ ...f,
      ...Object.fromEntries(Object.keys(formVazio).filter((c) => !['criterionComments', 'criterionReviewed'].includes(c)).map((c) => [c, String(recuperado[c] ?? f[c])])),
      criterionComments: Object.fromEntries(Object.keys(f.criterionComments).map((id) => [id, String(recuperado.criterionComments?.[id] ?? f.criterionComments[id])])),
      criterionReviewed: Object.fromEntries(Object.keys(f.criterionComments).filter((id) => recuperado.criterionReviewed?.[id] === true).map((id) => [id, true])),
    }))
  }
  async function analisar(atualizar = false) {
    if (analiseEmCurso.current || operacao.current) return
    analiseEmCurso.current = true; setAnalysisBusy(true); setAnalysisNotice(null)
    try {
      const analises = atualizar ? await listarAnalisesIa(redacaoId) : [await solicitarAnaliseIa(redacaoId)]
      if (!ativo.current) return
      setPagina((p) => ({ ...p, analises: atualizar ? analises : [...analises, ...p.analises.filter((a) => a.id !== analises[0].id)] }))
      setAnalysisNotice(avisoEstadoAnalise(analises[0]))
    } catch (error) {
      if (ativo.current) setAnalysisNotice({ type: 'error', message: erroApi(error, 'A resposta da análise foi interrompida. Consulte o resultado antes de solicitar outra análise. Seus comentários foram preservados.') })
    } finally {
      analiseEmCurso.current = false
      if (ativo.current) setAnalysisBusy(false)
    }
  }
  async function salvar(publicar = false) {
    if (operacao.current) return
    const dados = montarDadosFeedback(form)
    const erro = validarFeedback(dados, publicar)
    if (erro) { setFeedbackNotice({ type: 'error', message: erro }); return }
    if (publicar && !globalThis.confirm('Publicar esta correção para o aluno?')) return
    operacao.current = true; setFeedbackAction(publicar ? 'publishing' : 'saving'); setFeedbackNotice(null)
    let rascunhoEnviado = false
    let publicado = false
    try {
      await salvarRascunhoFeedback(redacaoId, dados)
      rascunhoEnviado = true
      if (publicar) { await publicarFeedback(redacaoId); publicado = true }
      const [feedback, redacao] = await Promise.all([obterFeedbackProfessor(redacaoId), obterRedacaoProfessor(redacaoId)])
      if (!ativo.current) return
      const formulario = { ...criarFormularioFeedback(redacao, feedback), criterionReviewed: form.criterionReviewed }
      setPagina((p) => ({ ...p, feedback, redacao }))
      setForm(formulario); setFormServidor(formulario); rascunho.descartar(formulario)
      setFeedbackNotice({ type: 'success', message: publicar ? 'Correção publicada. O aluno foi notificado no sistema.' : 'Rascunho salvo. O aluno ainda não pode visualizar estas alterações.' })
    } catch (error) {
      if (ativo.current) setFeedbackNotice({ type: 'error', message: publicado
        ? 'A publicação foi concluída, mas não foi possível atualizar a tela. Recarregue antes de publicar novamente.'
        : erroApi(error, rascunhoEnviado ? 'Rascunho salvo, mas a etapa seguinte não foi concluída. Seus comentários foram preservados.' : 'Não foi possível salvar. Seus comentários foram preservados.') })
    } finally {
      operacao.current = false
      if (ativo.current) setFeedbackAction(null)
    }
  }
  function pular() {
    if (operacao.current || analiseEmCurso.current || !pagina.fila?.proxima) return
    const alterado = JSON.stringify(form) !== JSON.stringify(formServidor)
    if (alterado) {
      rascunho.salvarAgora()
      if (!globalThis.confirm('Há alterações não enviadas ao servidor. Deseja ir para a próxima redação mesmo assim?')) return
    }
    navigate(`/professor/redacoes/${pagina.fila.proxima.id}`)
  }
  function abrirComentarios(ordens) {
    const ordem = ordens[0]
    focoCriterio.current = ordem
    setPainelAtivo('comentarios')
    if (mobile) setSheetAberto(true)
    else {
      requestAnimationFrame(() => { const alvo = document.getElementById(`review-criterion-${ordem}`); alvo?.scrollIntoView({ block: 'nearest' }); alvo?.focus() })
    }
  }

  const pronto = pagina.status === 'pronto'
  const redacao = pagina.redacao
  const analise = pagina.analises?.[0] ?? null
  const criterios = redacao?.tema.criterios ?? []
  const { trechos } = evidenciasVerificadas(redacao?.texto ?? '', analise)
  const base = criterios.filter(criterioFixo)
  const extras = criterios.filter((c) => !criterioFixo(c))
  const comentarios = <CriterionComments criterios={criterios} analise={analise} form={form} disabled={Boolean(feedbackAction)} onChange={mudarCriterio} />
  const controles = <>
    <section className="review-card review-criteria" aria-labelledby="review-criteria-title">
      <h2 id="review-criteria-title">Critérios da avaliação</h2>
      <h3>Base · sempre avaliados</h3>
      {base.map((c) => <div className={`review-criterion-row review-tone-${tomCriterio(c)}`} key={c.id}>
        <img src={fixedIcon} alt="Fixo" /><span className="review-color" aria-hidden="true" /><span>{c.nome}</span>
      </div>)}
      {!base.length && <p className="review-caption">Esta proposta utiliza critérios anteriores à base atual.</p>}
      <div className="review-criteria-subheading"><h3>Personalizados</h3><span className="review-badge">{extras.length} {extras.length === 1 ? 'cadastrado' : 'cadastrados'}</span></div>
      {extras.map((c) => <label className={`review-criterion-row review-tone-${tomCriterio(c, criterios.indexOf(c))}`} key={c.id}>
        <input type="checkbox" checked disabled aria-label={`Critério definido na proposta: ${c.nome}`} /><span className="review-color" aria-hidden="true" /><span>{c.nome}</span>
      </label>)}
      {!extras.length && <p className="review-caption">Nenhum critério personalizado nesta proposta.</p>}
      <p className="review-caption">Critérios definidos na proposta. A seleção individual por redação ainda não está disponível.</p>
      <Link className="review-text-link" to={pronto ? `/professor/temas/${redacao.tema.id}` : '/professor/turmas'}>Consultar proposta e critérios</Link>
    </section>
    <AnalysisPanel analysis={analise} isRequesting={analysisBusy} notice={analysisNotice} disabled={Boolean(feedbackAction)} onRequest={() => analisar()} onRefresh={() => analisar(true)} />
    <section className="review-card review-evidence-list" aria-labelledby="review-evidence-title">
      <h2 id="review-evidence-title">Trechos identificados</h2>
      {trechos.length ? <ol>{trechos.map((e, i) => {
        const c = criterios.find((item) => item.ordem === e.ordens[0])
        return <li key={`${e.inicio}-${e.fim}`}><button type="button" className={`review-tone-${tomCriterio(c ?? {}, Math.max(0, criterios.indexOf(c)))}`} onClick={() => abrirComentarios(e.ordens)}>
          <span className="review-color" aria-hidden="true" /><span>{e.trecho}</span><small>{String(i + 1).padStart(2, '0')}</small>
        </button></li>
      })}</ol> : <p className="review-caption">Nenhum trecho com localização confirmada nesta redação.</p>}
    </section>
  </>
  const tabs = <div className="review-tabs" role="tablist" aria-label="Painéis da correção">
    {['comentarios', 'criterios'].map((tab, i) => <button key={tab} type="button" id={`review-tab-${tab}`} role="tab" aria-selected={painelAtivo === tab}
      aria-controls={`review-panel-${tab}`} tabIndex={painelAtivo === tab ? 0 : -1} onClick={() => setPainelAtivo(tab)}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const outro = event.key === 'Home' ? 'comentarios' : event.key === 'End' ? 'criterios' : i === 0 ? 'criterios' : 'comentarios'
        setPainelAtivo(outro); document.getElementById(`review-tab-${outro}`)?.focus()
      }}>{tab === 'comentarios' ? 'Comentários' : 'Critérios e IA'}</button>)}
  </div>
  const ferramentas = <>{tabs}
    <div id="review-panel-comentarios" role="tabpanel" aria-labelledby="review-tab-comentarios" className={`review-comments-panel ${painelAtivo === 'comentarios' ? 'is-active' : ''}`}>{comentarios}</div>
    <div id="review-panel-criterios" role="tabpanel" aria-labelledby="review-tab-criterios" className={`review-criteria-panel ${painelAtivo === 'criterios' ? 'is-active' : ''}`}>{controles}</div>
  </>

  return <ProfessorWorkspaceLayout secao="Correção" imersivo pronto={pronto} turmas={pronto ? [redacao.tema.turma] : []}
    indicador={pagina.fila?.posicao ? <span className="review-position">Redação {pagina.fila.posicao} de {pagina.fila.total}</span> : null}
    cabecalho={<nav className="review-breadcrumb" aria-label="Caminho da correção"><Link to="/professor/turmas">Turmas</Link>{pronto && <><span aria-hidden="true">›</span><Link to={`/professor/turmas/${redacao.tema.turma.id}`}>{redacao.tema.turma.nome}</Link></>}<span aria-hidden="true">›</span><span>Correção</span></nav>}>
    <motion.main id="panel-main" className="review-main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
      {pagina.status === 'carregando' && <div className="review-loading"><h1>Correção do professor</h1><p role="status">Carregando redação e avaliação…</p><div aria-hidden="true" className="review-loading-grid"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div></div>}
      {pagina.status === 'erro' && <section className="review-card review-load-error" role="alert"><h1>Não foi possível abrir a redação</h1><p>{pagina.mensagem}</p><button className="panel-primary-button" onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</button></section>}
      {pronto && <div className="review-grid">
        <div className="review-center">
          <section className="review-card review-student">
            <span className="review-student-avatar" aria-hidden="true">{obterIniciais(redacao.aluno.nome)}</span>
            <div className="review-student-info"><h1>{redacao.aluno.nome}</h1><p>{redacao.tema.turma.nome} · {redacao.tema.enunciado}</p></div>
            <div className="review-student-actions"><button type="button" className="review-outline-button" disabled={!pagina.fila?.proxima || analysisBusy || Boolean(feedbackAction)} onClick={pular}>Pular</button>
              <button type="button" className="panel-primary-button" disabled={Boolean(feedbackAction)} onClick={() => salvar()}>{feedbackAction === 'saving' ? 'Salvando…' : 'Salvar'}</button></div>
          </section>
          {pagina.erroFila && <p className="review-caption">A fila de redações está indisponível. A correção atual permanece acessível.</p>}
          {rascunhoDivergente && <section className="review-notice" role="status"><strong>Rascunho local encontrado</strong><p>Há alterações não enviadas salvas neste dispositivo.</p><button type="button" className="panel-soft-button" disabled={Boolean(feedbackAction)} onClick={recuperarRascunho}>Recuperar rascunho</button> <button type="button" className="panel-soft-button" disabled={Boolean(feedbackAction)} onClick={() => rascunho.descartar(formServidor)}>Descartar rascunho local</button></section>}
          {!rascunhoDivergente && rascunho.salvoEm && <p className="review-caption" role="status">Alterações locais protegidas em {formatarData(rascunho.salvoEm)}.</p>}
          <article className="review-card review-essay">
            <div className="review-essay-heading"><h2>Redação do aluno</h2><span className="review-badge">{trechos.length} {trechos.length === 1 ? 'trecho localizado' : 'trechos localizados'} da IA</span><span className="review-caption">{redacao.texto?.trim() ? redacao.texto.trim().split(/\s+/u).length : 0} palavras</span></div>
            <EssayEvidenceText texto={redacao.texto} analise={analise} criterios={criterios} onEvidence={abrirComentarios} />
            <details className="review-submission"><summary>Informações da entrega</summary><p>{redacao.origemTexto === 'OCR' ? 'Texto digitalizado por OCR' : 'Texto digitado'} · {redacao.enviadaComAtraso ? 'Enviada com atraso' : 'Enviada no prazo'}</p><p>Enviada em {formatarData(redacao.enviadaEm)}. Prazo: {formatarData(redacao.prazoConsideradoEm)}.</p></details>
          </article>
          <FeedbackEditor action={feedbackAction} currentFeedback={pagina.feedback?.versaoAtual} form={form} notice={feedbackNotice} onFieldChange={mudarCampo} onPublish={() => salvar(true)} />
        </div>
        {mobile ? <>
          <button className="review-sheet-trigger" type="button" aria-haspopup="dialog" aria-expanded={sheetAberto} onClick={() => setSheetAberto(true)}>Comentários e critérios</button>
          {sheetAberto && <dialog ref={sheetRef} className="review-sheet" aria-labelledby="review-sheet-title" onCancel={(e) => { e.preventDefault(); setSheetAberto(false) }}>
            <div className="review-sheet-heading"><h2 id="review-sheet-title">Correção</h2><button className="panel-soft-button" type="button" onClick={() => setSheetAberto(false)}>Fechar</button></div>{ferramentas}
          </dialog>}
        </> : <aside className="review-tools" aria-label="Ferramentas de correção">{ferramentas}</aside>}
      </div>}
    </motion.main>
  </ProfessorWorkspaceLayout>
}
