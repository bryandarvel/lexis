import { classificarEvidencia } from '../../utils/ai-evidence.js'

export default function AnalysisPanel({ analysis, isRequesting, notice, onRequest, onRefresh, disabled }) {
  const pendente = ['PENDENTE', 'PROCESSANDO'].includes(analysis?.status)
  const result = analysis?.status === 'CONCLUIDA' ? analysis.resultadoEstruturado : null
  return <section className="review-analysis" aria-label="Análise consultiva por IA" aria-busy={isRequesting || pendente}>
    <button type="button" className="review-outline-button" disabled={disabled || isRequesting || pendente} onClick={onRequest}>
      {isRequesting ? 'Analisando…' : analysis ? 'Analisar novamente com IA' : 'Analisar com IA'}
    </button>
    <p className="review-caption">A IA não atribui nota. Revise cada sugestão antes de usá-la no feedback.</p>
    {(isRequesting || pendente) && <div role="status" className="review-notice"><progress aria-label="Análise por IA em andamento" /><p>Análise em andamento. A conclusão depende do serviço de IA.</p>{!isRequesting && <button type="button" className="panel-soft-button" onClick={onRefresh}>Atualizar análise</button>}</div>}
    {!analysis && !isRequesting && <p className="review-caption">Nenhuma análise solicitada para esta redação.</p>}
    {analysis?.status === 'ERRO' && <p role="alert" className="review-notice error">{analysis.mensagemErro ?? 'A análise não pôde ser concluída. Você pode tentar novamente.'}</p>}
    {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`review-notice ${notice.type}`}>{notice.message}</p>}
    {result && <details className="review-card review-analysis-details"><summary>Detalhes da análise</summary>
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
