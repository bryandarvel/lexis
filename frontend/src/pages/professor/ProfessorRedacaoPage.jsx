import { formatarData } from '../../utils/formatar-data.js'
import { useEffect, useRef, useState } from 'react'
import Botao from '../../components/base/Botao.jsx'
import DialogoConfirmacao from '../../components/base/DialogoConfirmacao.jsx'
import { Link, useNavigate, useParams } from 'react-router'
import AnalysisPanel from '../../components/correction/AnalysisPanel.jsx'
import EssayEvidenceText from '../../components/correction/EssayEvidenceText.jsx'
import FeedbackEditor, { FeedbackActions } from '../../components/correction/FeedbackEditor.jsx'
import CriterionComments from '../../components/correction/CriterionComments.jsx'
import AppShell from '../../layouts/AppShell.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRascunho } from '../../hooks/useRascunho.js'
import { focarVinculo, useVinculoDeTrechos } from '../../hooks/useVinculoDeTrechos.js'
import { listarAnalisesIa, solicitarAnaliseIa } from '../../services/analises-ia.js'
import { obterFeedbackProfessor, publicarFeedback, salvarRascunhoFeedback } from '../../services/feedbacks.js'
import { listarRedacoesDaTurma, obterRedacaoProfessor } from '../../services/redacoes.js'
import { criarChaveRascunho } from '../../utils/draft-storage.js'
import { obterIniciais } from '../../utils/professor-dashboard.js'
import { avisoEstadoAnalise, obterEsperaMinimaAnalise, obterFalhaAnteriorPublicacao } from '../../utils/external-request.js'
import { criarFormularioFeedback, montarDadosFeedback, validarFeedback, organizarFila, atualizarComentario, selecionarAnaliseParaCorrecao, atualizarTrechos, recuperarTrechos, prepararMarcacoes, assinaturaPublicavel } from '../../utils/professor-correction.js'
import { chaveTrecho } from '../../utils/trechos-feedback.js'
import { calcularNotaTotalCompetencias } from '../../constants/competencias-enem.js'
import { obterPublicacaoFeedback } from '../../utils/professor-topic.js'
import './professor-correction.css'

const erroApi = (error, fallback) => error?.response?.data?.error?.message ?? fallback
const formVazio = { competencia1: '', competencia2: '', competencia3: '', competencia4: '', competencia5: '', legacyScore: '', generalComment: '', criterionComments: {}, criterionReviewed: {}, criterionTrechos: {}, criterionTrechosAlterados: {} }
const camposTexto = ['competencia1', 'competencia2', 'competencia3', 'competencia4', 'competencia5', 'legacyScore', 'generalComment']

export default function ProfessorRedacaoPage() {
  const { redacaoId } = useParams()
  const { usuario } = useAuth()
  // Ao trocar de redação, nenhum estado ou resposta tardia pode atravessar para outro aluno.
  return <Correcao key={`${usuario?.id}:${redacaoId}`} redacaoId={redacaoId} usuarioId={usuario?.id} />
}

function Correcao({ redacaoId, usuarioId }) {
  const navigate = useNavigate()
  const { vinculo, selecionar, limpar, aoPressionarTecla } = useVinculoDeTrechos()
  const [pagina, setPagina] = useState({ status: 'carregando', analises: [], fila: null })
  const [tentativa, setTentativa] = useState(0)
  const [form, setForm] = useState(formVazio)
  const [formServidor, setFormServidor] = useState(null)
  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [feedbackAction, setFeedbackAction] = useState(null)
  const [analysisNotice, setAnalysisNotice] = useState(null)
  const [analysisRetryAt, setAnalysisRetryAt] = useState(0)
  const [publicacaoConfirmadaEm, setPublicacaoConfirmadaEm] = useState(null)
  const [avisoAnteriorPublicacao, setAvisoAnteriorPublicacao] = useState(null)
  const [feedbackNotice, setFeedbackNotice] = useState(null)
  const [descartadas, setDescartadas] = useState(() => new Set())
  const [confirmaPublicacao, setConfirmaPublicacao] = useState(false)
  const [destinoFila, setDestinoFila] = useState(null)
  const [recarregarObrigatorio, setRecarregarObrigatorio] = useState(false)
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

  function mudarCampo(campo, valor) {
    if (!operacao.current) setForm((f) => ({ ...f, [campo]: valor }))
  }
  function mudarCriterio(id, valor) {
    if (!operacao.current) setForm((f) => atualizarComentario(f, id, valor))
  }
  function mudarTrechos(id, trechos) {
    limpar()
    if (!operacao.current) setForm((f) => atualizarTrechos(f, id, trechos))
  }
  function recuperarRascunho() {
    const recuperado = rascunho.recuperar()
    if (!recuperado) return
    // Mantém somente campos e critérios da redação atual, sem importar texto da redação.
    setForm((f) => recuperarTrechos({ ...f,
      ...Object.fromEntries(camposTexto.map((c) => [c, String(recuperado[c] ?? f[c])])),
      criterionComments: Object.fromEntries(Object.keys(f.criterionComments).map((id) => [id, String(recuperado.criterionComments?.[id] ?? f.criterionComments[id])])),
      criterionReviewed: Object.fromEntries(Object.keys(f.criterionComments).filter((id) => recuperado.criterionReviewed?.[id] === true).map((id) => [id, true])),
    }, recuperado, pagina.redacao.texto))
  }
  async function analisar(atualizar = false) {
    if (analiseEmCurso.current || operacao.current || (!atualizar && Date.now() < analysisRetryAt)) return
    analiseEmCurso.current = true; setAnalysisBusy(true); setAnalysisNotice(null)
    try {
      const analises = atualizar ? await listarAnalisesIa(redacaoId) : [await solicitarAnaliseIa(redacaoId)]
      if (!ativo.current) return
      setPagina((p) => ({ ...p, analises: atualizar ? analises : [...analises, ...p.analises.filter((a) => a.id !== analises[0].id)] }))
      setAnalysisNotice(avisoEstadoAnalise(analises[0], { nova: !atualizar }))
    } catch (error) {
      if (ativo.current) {
        setAnalysisRetryAt((anterior) => Math.max(anterior, obterEsperaMinimaAnalise(error)))
        setAnalysisNotice({ type: 'error', ocorridaEm: Date.now(), message: erroApi(error, 'A resposta da análise foi interrompida. Consulte o resultado antes de solicitar outra análise. Seus comentários foram preservados.') })
      }
      // Consultar o histórico não chama o modelo. Preserva a falha original se a consulta falhar.
      if (!atualizar && ativo.current) {
        try {
          const analises = await listarAnalisesIa(redacaoId)
          if (ativo.current) setPagina((p) => ({ ...p, analises }))
        } catch { /* O resultado já disponível e os comentários humanos permanecem na tela. */ }
      }
    } finally {
      analiseEmCurso.current = false
      if (ativo.current) setAnalysisBusy(false)
    }
  }
  function checarEnvio(publicar) {
    const semComentario = criterios.filter((c) => form.criterionTrechos[c.id]?.length && !form.criterionComments[c.id]?.trim())
    const dados = montarDadosFeedback(form, texto)
    const erro = semComentario.length
      ? `Escreva um comentário para os critérios com trechos marcados: ${semComentario.map((c) => c.nome).join(', ')}.`
      : validarFeedback(dados, publicar)
    if (erro) { setFeedbackNotice({ type: 'error', message: erro }); return null }
    return dados
  }
  function pedirPublicacao() {
    if (!operacao.current && !recarregarObrigatorio && !publicacaoIdentica && checarEnvio(true)) setConfirmaPublicacao(true)
  }
  async function salvar(publicar = false) {
    if (operacao.current || recarregarObrigatorio || (publicar && publicacaoIdentica)) return
    const dados = checarEnvio(publicar)
    if (!dados) return
    setConfirmaPublicacao(false)
    operacao.current = true; setFeedbackAction(publicar ? 'publishing' : 'saving'); setFeedbackNotice(null)
    let rascunhoEnviado = false
    let publicado = false
    try {
      const versaoSalva = await salvarRascunhoFeedback(redacaoId, dados)
      rascunhoEnviado = true
      if (!ativo.current) return
      const feedbackSalvo = { ...pagina.feedback, versaoAtual: versaoSalva }
      const salvo = { ...criarFormularioFeedback(redacao, feedbackSalvo), criterionReviewed: form.criterionReviewed }
      setPagina((p) => ({ ...p, feedback: feedbackSalvo }))
      setForm(salvo); setFormServidor(salvo); rascunho.descartar(salvo)
      if (publicar) {
        const resposta = await publicarFeedback(redacaoId)
        publicado = true
        if (!ativo.current) return
        // O POST já confirmou a publicação, mesmo se a consulta seguinte falhar.
        setPublicacaoConfirmadaEm(resposta.feedback.publicadoEm)
        if (analysisNotice?.type === 'error') {
          if (!analysisNotice.analiseId) setAvisoAnteriorPublicacao(analysisNotice)
          setAnalysisNotice((atual) => atual === analysisNotice ? null : atual)
        }
        const [feedback, redacaoAtual] = await Promise.all([obterFeedbackProfessor(redacaoId), obterRedacaoProfessor(redacaoId)])
        if (!ativo.current) return
        const formulario = { ...criarFormularioFeedback(redacaoAtual, feedback), criterionReviewed: form.criterionReviewed }
        setPagina((p) => ({ ...p, feedback, redacao: redacaoAtual }))
        setForm(formulario); setFormServidor(formulario); rascunho.descartar(formulario)
      }
      setFeedbackNotice({ type: 'success', message: publicar ? 'Correção publicada. O aluno foi notificado no sistema.' : 'Rascunho salvo. O aluno ainda não pode visualizar estas alterações.' })
    } catch (error) {
      if (ativo.current && publicado) setRecarregarObrigatorio(true)
      if (ativo.current) setFeedbackNotice({ type: 'error', message: publicado
        ? 'A publicação foi concluída, mas não foi possível atualizar a tela. Recarregue antes de publicar novamente.'
        : erroApi(error, rascunhoEnviado ? 'Rascunho salvo, mas a etapa seguinte não foi concluída. Seus comentários foram preservados.' : 'Não foi possível salvar. Seus comentários foram preservados.') })
    } finally {
      operacao.current = false
      if (ativo.current) setFeedbackAction(null)
    }
  }
  function navegarNaFila(destino) {
    if (operacao.current || analiseEmCurso.current || !destino) return
    const alterado = JSON.stringify(form) !== JSON.stringify(formServidor)
    if (alterado) {
      rascunho.salvarAgora()
      setDestinoFila(destino)
      return
    }
    navigate(`/professor/redacoes/${destino.id}`)
  }
  function abrirComentarios(item, pendente) {
    if (!pendente) {
      const chave = chaveTrecho(item)
      const destinos = item.criterios.map(({ id, nome }) => ({ id: `review-comment-${id}`, nome }))
      selecionar({ origem: `review-selo-${chave}`, chaves: [chave], criterios: item.criterios.map((c) => c.id), destinos, numero: item.numero },
        destinos.length === 1 ? destinos[0].id : undefined)
      return
    }
    const alvo = document.getElementById(`review-suggestion-${item.chave}`)
    const details = alvo?.closest('details')
    if (details) details.open = true
    focarVinculo(alvo)
  }

  function destacarComentario(criterio) {
    const chaves = marcacoes.porCriterio[criterio.id].marcados.map(chaveTrecho)
    selecionar({ origem: `review-destacar-${criterio.id}`, chaves, criterios: [criterio.id] }, `review-selo-${chaves[0]}`)
  }

  const pronto = pagina.status === 'pronto'
  const redacao = pagina.redacao
  const { ultima: ultimaAnalise, concluida: analise } = selecionarAnaliseParaCorrecao(pagina.analises)
  const falhaAnteriorPublicacao = obterFalhaAnteriorPublicacao(
    pagina.analises, publicacaoConfirmadaEm, obterPublicacaoFeedback(pagina.feedback)?.publicadoEm,
  )
  const criterios = redacao?.tema.criterios ?? []
  const texto = redacao?.texto ?? ''
  const marcacoes = prepararMarcacoes(texto, criterios, form, analise, descartadas)
  const numeros = new Map(marcacoes.aprovados.map((item) => [chaveTrecho(item), item.numero]))
  const publicada = obterPublicacaoFeedback(pagina.feedback)
  const versaoAtual = pagina.feedback?.versaoAtual
  const assinatura = assinaturaPublicavel(form, texto)
  const publicacaoIdentica = Boolean(pronto && publicada && assinatura === assinaturaPublicavel(criarFormularioFeedback(redacao, { versaoAtual: publicada }), texto))
  const salvoSemEdicoes = Boolean(formServidor && assinatura === assinaturaPublicavel(formServidor, texto))
  const versaoDialogo = versaoAtual?.status === 'RASCUNHO' ? `Versão ${versaoAtual.numero}`
    : `Versão ${(versaoAtual?.numero ?? 0) + 1} (prévia)`
  const bloqueado = Boolean(feedbackAction) || recarregarObrigatorio

  const trilha = [
    { rotulo: 'Turmas', para: '/professor/turmas' },
    ...(pronto ? [{ rotulo: redacao.tema.turma.nome, para: `/professor/turmas/${redacao.tema.turma.id}` }] : []),
    'Correção',
  ]

  return <AppShell imersivo trilha={trilha}
    indicador={pagina.fila?.posicao ? <span className="review-position">Redação {pagina.fila.posicao} de {pagina.fila.total}</span> : null}>
    <div className="review-main" onKeyDown={aoPressionarTecla}>
      {pagina.status === 'carregando' && <div className="review-loading"><h1>Correção do professor</h1><p role="status">Carregando redação e avaliação…</p><div aria-hidden="true" className="review-loading-grid"><div className="skeleton-block" /><div className="skeleton-block" /><div className="skeleton-block" /></div></div>}
      {pagina.status === 'erro' && <section className="review-card review-load-error" role="alert"><h1>Não foi possível abrir a redação</h1><p>{pagina.mensagem}</p><Botao onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</Botao></section>}
      {pronto && <div className="review-grid">
        <div className="review-center">
          <section className="review-card review-student">
            <span className="review-student-avatar" aria-hidden="true">{obterIniciais(redacao.aluno.nome)}</span>
            <div className="review-student-info"><h1>{redacao.aluno.nome}</h1><p>{redacao.tema.turma.nome} · {redacao.tema.enunciado}</p></div>
          </section>
          {pagina.erroFila && <p className="review-caption">A fila de redações está indisponível. A correção atual permanece acessível.</p>}
          {rascunhoDivergente && <section className="review-notice" role="status"><strong>Rascunho local encontrado</strong><p>Há alterações não enviadas salvas neste dispositivo.</p><Botao type="button" variante="secundario" disabled={Boolean(feedbackAction)} onClick={recuperarRascunho}>Recuperar rascunho</Botao> <Botao type="button" variante="secundario" disabled={Boolean(feedbackAction)} onClick={() => rascunho.descartar(formServidor)}>Descartar rascunho local</Botao></section>}
          {!rascunhoDivergente && rascunho.salvoEm && <p className="review-caption" role="status">Alterações locais protegidas em {formatarData(rascunho.salvoEm, 'dataHora', { vazio: 'Não informada' })}.</p>}
          <article className="review-card review-essay">
            <div className="review-essay-heading"><h2 id="review-essay-title" tabIndex={-1}>Redação do aluno</h2><span className="review-caption">{texto.trim() ? texto.trim().split(/\s+/u).length : 0} palavras</span></div>
            <EssayEvidenceText texto={texto} criterios={criterios} marcacoes={marcacoes} analise={analise} disabled={bloqueado} vinculo={vinculo}
              onMark={(id, trecho) => mudarTrechos(id, [...marcacoes.porCriterio[id].marcados, trecho])}
              onUnmark={(id, trechos) => mudarTrechos(id, marcacoes.porCriterio[id].marcados.filter((t) => !trechos.some((r) => r.inicio === t.inicio && r.fim === t.fim)))}
              onEvidence={abrirComentarios} />
            <details className="review-submission"><summary>Informações da entrega</summary><p>{redacao.origemTexto === 'OCR' ? 'Texto digitalizado por OCR' : 'Texto digitado'} · {redacao.enviadaComAtraso ? 'Enviada com atraso' : 'Enviada no prazo'}</p><p>Enviada em {formatarData(redacao.enviadaEm, 'dataHora', { vazio: 'Não informada' })}. Prazo: {formatarData(redacao.prazoConsideradoEm, 'dataHora', { vazio: 'Não informada' })}.</p></details>
          </article>
          <Link className="review-text-link" to={`/professor/temas/${redacao.tema.id}`}>Consultar proposta e critérios</Link>
        </div>
        <div className="review-side">
        <aside className="review-tools" aria-label="Margem de correção">
          <AnalysisPanel analysis={ultimaAnalise} resultAnalysis={analise} falhaAnterior={falhaAnteriorPublicacao} avisoAnterior={avisoAnteriorPublicacao} retryAt={analysisRetryAt} isRequesting={analysisBusy} notice={analysisNotice} disabled={bloqueado} onRequest={() => analisar()} onRefresh={() => analisar(true)} />
          <CriterionComments criterios={criterios} analise={analise} form={form} disabled={bloqueado} onChange={mudarCriterio} textoRedacao={texto}
            marcacoes={marcacoes.porCriterio} numeros={numeros} onTrechos={mudarTrechos} vinculo={vinculo} onDestacar={destacarComentario}
            onDescartar={(chave) => setDescartadas((atual) => new Set([...atual, chave]))}
            onVerNoTexto={(item) => focarVinculo(document.getElementById(`review-selo-${chaveTrecho(item)}`))} />
        </aside>
        <section className="review-evaluation" aria-label="Avaliação">
          <FeedbackEditor action={feedbackAction} form={form} onFieldChange={mudarCampo} bloqueado={recarregarObrigatorio} />
        </section>
        </div>
        <div className="review-actions-area">
        <FeedbackActions action={feedbackAction} currentFeedback={versaoAtual} notice={feedbackNotice}
          publicada={Boolean(publicada)} publicacaoIdentica={publicacaoIdentica} recarregarObrigatorio={recarregarObrigatorio}
          onSave={() => salvar()} onPublish={pedirPublicacao} onReload={() => globalThis.location.reload()} />
        {(pagina.fila?.anterior || pagina.fila?.proxima) && <nav aria-label="Fila de correção" className="review-queue">
          {pagina.fila?.anterior && <Botao variante="secundario" disabled={analysisBusy || bloqueado} onClick={() => navegarNaFila(pagina.fila.anterior)}>Redação anterior</Botao>}
          {pagina.fila?.proxima && <Botao variante="secundario" disabled={analysisBusy || bloqueado} onClick={() => navegarNaFila(pagina.fila.proxima)}>Próxima redação</Botao>}
        </nav>}
        </div>
        <nav className="review-section-nav" aria-label="Seções da correção">
          {[['review-essay-title', 'Redação'], ['review-comments-title', 'Comentários'], ['review-grades-title', 'Notas']].map(([id, nome]) =>
            <a key={id} href={`#${id}`} onClick={(event) => { event.preventDefault(); focar(document.getElementById(id)) }}>{nome}</a>)}
        </nav>
        <DialogoConfirmacao aberto={confirmaPublicacao} titulo={publicada ? 'Publicar nova versão?' : 'Publicar correção?'}
          descricao={`${redacao.aluno.nome} · ${versaoDialogo} · Nota ${calcularNotaTotalCompetencias(montarDadosFeedback(form, texto)) ?? '—'}`}
          efeitos={[
            ...(versaoAtual?.status === 'RASCUNHO' && salvoSemEdicoes ? ['O rascunho salvo será publicado.'] : ['Suas alterações serão salvas e publicadas nesta versão.']),
            `Critérios com comentário: ${criterios.filter((c) => form.criterionComments[c.id]?.trim()).length} de ${criterios.length}.`,
            publicada ? 'O aluno receberá um novo aviso no sistema.' : 'O aluno será notificado no sistema.',
          ]}
          cancelarRotulo="Voltar à correção" confirmarRotulo={publicada ? 'Publicar nova versão' : 'Publicar correção'} onConfirmar={() => salvar(true)} onCancelar={() => setConfirmaPublicacao(false)} />
        <DialogoConfirmacao aberto={Boolean(destinoFila)} titulo="Ir para outra redação?"
          descricao="Há alterações nesta correção que ainda não foram enviadas ao servidor."
          efeitos={['O rascunho fica disponível neste dispositivo para recuperar ao voltar.']}
          cancelarRotulo="Voltar à correção" confirmarRotulo="Ir para a redação"
          onConfirmar={() => { if (destinoFila) navigate(`/professor/redacoes/${destinoFila.id}`) }}
          onCancelar={() => setDestinoFila(null)} />
      </div>}
    </div>
  </AppShell>
}
