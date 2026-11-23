import { formatarData } from '../../utils/formatar-data.js'
import { useEffect, useId, useState } from 'react'
import Botao from '../base/Botao.jsx'
import { IconeAnalisar, IconeRecarregar } from './icones-correcao.jsx'
import { classificarEvidencia } from '../../utils/ai-evidence.js'
import { avisoAnaliseDuplicado, avisoAtualDaAnalise, mensagemErroAnalise, segundosRestantesAnalise } from '../../utils/external-request.js'

export default function AnalysisPanel({ analysis, resultAnalysis = analysis, falhaAnterior, avisoAnterior, retryAt = 0, isRequesting, notice, onRequest, onRefresh, disabled }) {
  const falhaAtual = analysis?.status === 'ERRO' && (!falhaAnterior || analysis.id !== falhaAnterior.id)
  const aviso = falhaAnterior && notice?.type === 'error' && notice.analiseId === falhaAnterior.id
    ? null : avisoAtualDaAnalise(analysis, notice)
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    setAgora(Date.now())
    if (retryAt <= Date.now()) return undefined
    const timer = setInterval(() => {
      const instante = Date.now()
      setAgora(instante)
      if (instante >= retryAt) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [retryAt])
  const espera = segundosRestantesAnalise(retryAt, agora)
  const pendente = ['PENDENTE', 'PROCESSANDO'].includes(analysis?.status)
  const result = resultAnalysis?.status === 'CONCLUIDA' ? resultAnalysis.resultadoEstruturado : null
  const anterior = result && resultAnalysis.id !== analysis?.id
  const dataResultado = formatarData(resultAnalysis?.concluidaEm ?? resultAnalysis?.solicitadaEm, 'dataHora')
  const dataTentativa = formatarData(analysis?.solicitadaEm, 'dataHora')
  const dataFalhaAnterior = formatarData(falhaAnterior?.concluidaEm ?? falhaAnterior?.solicitadaEm, 'dataHora')
  const dataAvisoAnterior = formatarData(avisoAnterior?.ocorridaEm, 'dataHora')
  const idTitulo = useId()
  /*
   * Issue #179: o card ganhou título visível — antes só existia o aria-label,
   * então o painel não se anunciava na tela. O botão de pedir a análise é a
   * ação principal enquanto não há resultado; com resultado, ele vira a ação
   * secundária "Gerar nova análise", abaixo das sugestões.
   */
  const acao = (
    <Botao type="button" className="review-analysis-acao" forma="pilula"
      variante={result ? 'contorno' : 'primario'}
      disabled={disabled || isRequesting || pendente || espera > 0} onClick={onRequest}>
      {result ? <IconeRecarregar /> : <IconeAnalisar />}
      {isRequesting ? 'Analisando…' : result ? 'Gerar nova análise' : 'Analisar redação com IA'}
    </Botao>
  )

  return <section className="review-card review-analysis" aria-labelledby={idTitulo} aria-busy={isRequesting || pendente}>
    <h2 id={idTitulo} className="review-section-title">Análise de apoio da IA</h2>
    <p className="review-caption">
      {result
        ? 'Revise as sugestões. A nota é atribuída pelo professor.'
        : 'A IA sugere pontos para sua revisão. A nota é atribuída pelo professor.'}
    </p>
    {!result && acao}
    {espera > 0 && <p className="review-notice">Nova solicitação disponível em pelo menos {espera} s. A disponibilidade e os limites do serviço de IA ainda podem impedir a análise; não haverá nova tentativa automática.</p>}
    {(isRequesting || pendente) && <div role="status" className="review-notice"><progress aria-label="Análise por IA em andamento" /><p>Análise em andamento. A conclusão depende do serviço de IA.</p>{!isRequesting && <Botao type="button" variante="secundario" onClick={onRefresh}>Atualizar análise</Botao>}</div>}
    {!analysis && !isRequesting && <p className="review-caption">Nenhuma análise solicitada para esta redação.</p>}
    {falhaAtual && !isRequesting && <p role="alert" className="review-notice error">{dataTentativa && <><strong>Última tentativa: {dataTentativa}</strong><br /></>}{mensagemErroAnalise(analysis)}</p>}
    {aviso && !(falhaAtual && !isRequesting && avisoAnaliseDuplicado(analysis, aviso)) && <p role={aviso.type === 'error' ? 'alert' : 'status'} className={`review-notice ${aviso.type}`}>{aviso.message}</p>}
    {!isRequesting && !pendente && aviso?.type === 'error' && <Botao type="button" variante="secundario" disabled={disabled} onClick={onRefresh}>Consultar resultado existente</Botao>}
    {(falhaAnterior || avisoAnterior) && <details className="review-card review-analysis-details">
      <summary>Falha de IA anterior à publicação</summary>
      {falhaAnterior && <p>{dataFalhaAnterior && <><strong>{dataFalhaAnterior}</strong><br /></>}{mensagemErroAnalise(falhaAnterior)}</p>}
      {avisoAnterior && !avisoAnaliseDuplicado(falhaAnterior, avisoAnterior) && <p>{dataAvisoAnterior && <><strong>{dataAvisoAnterior}</strong><br /></>}{avisoAnterior.message}</p>}
    </details>}
    {anterior && <p role="status" className="review-notice">Exibindo a última análise concluída{dataResultado ? `, de ${dataResultado}` : ''}. A tentativa mais recente não substituiu esse resultado. Revise as sugestões antes de usá-las.</p>}
    {result && <details className="review-analysis-details">
      <summary>
        <span className="review-analysis-sumario">Mostrar sugestões da IA</span>
        {dataResultado && <span className="review-analysis-data">Análise salva em {dataResultado}</span>}
      </summary>
      <h3>Resumo geral</h3><p>{result.resumoGeral}</p>
      <h3>Pontos fortes</h3><ul>{result.pontosFortes?.map((t, i) => <li key={i}>{t}</li>)}</ul>
      <h3>Pontos de atenção</h3><ul>{result.pontosDeAtencao?.map((t, i) => <li key={i}>{t}</li>)}</ul>
      {result.analisePorCriterio?.map((c) => <section key={`${c.ordem}-${c.criterio}`}><h3>{c.criterio}</h3><p>{c.diagnostico}</p>
        <ul>{c.evidencias?.map((e, i) => { const info = classificarEvidencia(e); return <li key={i}><q>{info.trecho}</q><small>{info.rotulo}</small></li> })}</ul>
        <h4>Orientação ao professor</h4><p>{c.orientacaoAoProfessor}</p>
      </section>)}
      <h3>Observações finais</h3><p>{result.observacoesFinais}</p>
    </details>}
    {result && acao}
  </section>
}
