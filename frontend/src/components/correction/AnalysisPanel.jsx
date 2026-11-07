import { useEffect, useState } from 'react'
import { classificarEvidencia } from '../../utils/ai-evidence.js'
import { avisoAnaliseDuplicado, avisoAtualDaAnalise, mensagemErroAnalise, segundosRestantesAnalise } from '../../utils/external-request.js'

export default function AnalysisPanel({ analysis, resultAnalysis = analysis, retryAt = 0, isRequesting, notice, onRequest, onRefresh, disabled }) {
  const aviso = avisoAtualDaAnalise(analysis, notice)
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
  const instante = resultAnalysis?.concluidaEm ?? resultAnalysis?.solicitadaEm
  const dataResultado = instante && !Number.isNaN(new Date(instante).getTime())
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(instante)) : null
  const dataTentativa = analysis?.solicitadaEm && !Number.isNaN(new Date(analysis.solicitadaEm).getTime())
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(analysis.solicitadaEm)) : null
  return <section className="review-analysis" aria-label="Análise consultiva por IA" aria-busy={isRequesting || pendente}>
    <button type="button" className="review-outline-button" disabled={disabled || isRequesting || pendente || espera > 0} onClick={onRequest}>
      {isRequesting ? 'Analisando…' : analysis ? 'Analisar novamente com IA' : 'Analisar com IA'}
    </button>
    <p className="review-caption">A IA não atribui nota. Revise cada sugestão antes de usá-la no feedback.</p>
    {espera > 0 && <p className="review-notice">Nova solicitação disponível em pelo menos {espera} s. A disponibilidade e os limites do serviço de IA ainda podem impedir a análise; não haverá nova tentativa automática.</p>}
    {(isRequesting || pendente) && <div role="status" className="review-notice"><progress aria-label="Análise por IA em andamento" /><p>Análise em andamento. A conclusão depende do serviço de IA.</p>{!isRequesting && <button type="button" className="panel-soft-button" onClick={onRefresh}>Atualizar análise</button>}</div>}
    {!analysis && !isRequesting && <p className="review-caption">Nenhuma análise solicitada para esta redação.</p>}
    {analysis?.status === 'ERRO' && !isRequesting && <p role="alert" className="review-notice error">{dataTentativa && <><strong>Última tentativa: {dataTentativa}</strong><br /></>}{mensagemErroAnalise(analysis)}</p>}
    {aviso && !avisoAnaliseDuplicado(analysis, aviso) && <p role={aviso.type === 'error' ? 'alert' : 'status'} className={`review-notice ${aviso.type}`}>{aviso.message}</p>}
    {!isRequesting && !pendente && aviso?.type === 'error' && <button type="button" className="panel-soft-button" disabled={disabled} onClick={onRefresh}>Consultar resultado existente</button>}
    {anterior && <p role="status" className="review-notice">Exibindo a última análise concluída{dataResultado ? `, de ${dataResultado}` : ''}. A tentativa mais recente não substituiu esse resultado. Revise as sugestões antes de usá-las.</p>}
    {result && <details className="review-card review-analysis-details"><summary>Detalhes da análise{dataResultado ? ` salva em ${dataResultado}` : ''}</summary>
      <h3>Resumo geral</h3><p>{result.resumoGeral}</p>
      <h3>Pontos fortes</h3><ul>{result.pontosFortes?.map((t, i) => <li key={i}>{t}</li>)}</ul>
      <h3>Pontos de atenção</h3><ul>{result.pontosDeAtencao?.map((t, i) => <li key={i}>{t}</li>)}</ul>
      {result.analisePorCriterio?.map((c) => <section key={`${c.ordem}-${c.criterio}`}><h3>{c.criterio}</h3><p>{c.diagnostico}</p>
        <ul>{c.evidencias?.map((e, i) => { const info = classificarEvidencia(e); return <li key={i}><q>{info.trecho}</q><small>{info.rotulo}</small></li> })}</ul>
        <h4>Orientação ao professor</h4><p>{c.orientacaoAoProfessor}</p>
      </section>)}
      <h3>Observações finais</h3><p>{result.observacoesFinais}</p>
    </details>}
  </section>
}
