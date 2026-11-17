import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import Botao from '../base/Botao.jsx'
import { chaveTrecho, criarTrechoDaSelecao, lerIntervaloSelecionado, limitesDeGrafemas, moverGrafema, podeAcrescentarTrecho } from '../../utils/trechos-feedback.js'
import { tomCriterio } from '../../utils/professor-correction.js'
import { resumirEvidencias } from '../../utils/ai-evidence.js'
import { AjusteBordas } from './SelecaoTrechos.jsx'

export default function EssayEvidenceText({ texto = '', criterios, marcacoes, analise, onMark, onEvidence, disabled }) {
  const instrucao = useId()
  const area = useRef(null)
  const modoRef = useRef(null)
  const barra = useRef(null)
  const ultimaSelecao = useRef(null)
  const [nativa, setNativa] = useState(null)
  const [teclado, setTeclado] = useState(null)
  const [ajuste, setAjuste] = useState(null)
  const [aviso, setAviso] = useState('')
  const limites = useMemo(() => limitesDeGrafemas(texto), [texto])
  const { aprovados, pendentes, porCriterio } = marcacoes
  const resumoIa = resumirEvidencias(analise?.resultadoEstruturado?.analisePorCriterio)
  const intervalo = teclado
    ? { inicio: Math.min(teclado.ancora, teclado.cursor), fim: Math.max(teclado.ancora, teclado.cursor) }
    : nativa
  const proposta = ajuste ?? intervalo
  const candidato = proposta && criarTrechoDaSelecao(texto, proposta.inicio, proposta.fim)
  const erroBorda = candidato?.trecho && (!limites.includes(proposta.inicio) || !limites.includes(proposta.fim))
  const pronto = candidato?.trecho && !erroBorda ? candidato.trecho : null
  const mostrarBarra = Boolean(intervalo && intervalo.inicio !== intervalo.fim)

  useEffect(() => {
    if (teclado || disabled) return undefined
    const consultar = () => {
      const selecionado = lerIntervaloSelecionado(area.current, document.getSelection())
      if (!selecionado) return
      if (ultimaSelecao.current?.inicio === selecionado.inicio && ultimaSelecao.current?.fim === selecionado.fim) return
      ultimaSelecao.current = selecionado
      setNativa(selecionado)
      setAjuste(null)
      setAviso('')
    }
    const eventos = ['selectionchange', 'pointerup', 'touchend', 'keyup']
    eventos.forEach((evento) => document.addEventListener(evento, consultar))
    return () => eventos.forEach((evento) => document.removeEventListener(evento, consultar))
  }, [teclado, disabled])

  useEffect(() => {
    if (teclado) area.current?.querySelector('.has-caret')?.scrollIntoView({ block: 'nearest' })
  }, [teclado])

  function limpar(foco) {
    if (lerIntervaloSelecionado(area.current, document.getSelection())) document.getSelection().removeAllRanges()
    ultimaSelecao.current = null
    setNativa(null); setTeclado(null); setAjuste(null); setAviso('')
    if (foco === 'modo') modoRef.current?.focus()
    if (foco === 'texto') area.current?.focus()
  }

  function usarTeclado(event) {
    if (!teclado || event.target !== area.current) return
    if (event.key === 'Enter' && mostrarBarra) {
      event.preventDefault()
      barra.current?.focus()
      return
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const cursor = event.key === 'Home' ? 0 : event.key === 'End' ? texto.length
      : moverGrafema(limites, teclado.cursor, event.key === 'ArrowLeft' ? -1 : 1)
    setTeclado({ cursor, ancora: event.shiftKey ? teclado.ancora : cursor })
    setAjuste(null); setAviso('')
  }

  const pontos = [...new Set([0, texto.length,
    ...[...aprovados, ...pendentes].flatMap(({ inicio, fim }) => [inicio, fim]),
    ...(teclado ? [intervalo.inicio, intervalo.fim] : []),
  ])].sort((a, b) => a - b)
  const selo = (item, pendente) => (
    <button key={pendente ? item.chave : chaveTrecho(item)} type="button"
      className={`review-seal review-tone-${tomCriterio(item.criterios[0])}${pendente ? ' is-pending' : ''}`}
      data-numero={pendente ? 'IA' : item.numero} data-marca={!pendente ? chaveTrecho(item) : undefined}
      aria-label={`${pendente ? 'Sugestão da IA não aprovada' : `Trecho ${item.numero}`}: ${item.criterios.map((c) => c.nome).join(', ')}. ${item.trecho.slice(0, 100)}`}
      onClick={() => onEvidence(item, pendente)} />
  )
  return <figure onKeyDown={(event) => {
    if (event.key === 'Escape' && (teclado || nativa)) { event.preventDefault(); limpar(teclado ? 'modo' : 'texto') }
  }}>
    <figcaption className="review-caption" id={instrucao}>
      Selecione um trecho da redação para marcar em um critério. Só os trechos que você marcar chegam ao aluno.
    </figcaption>
    <Botao ref={modoRef} variante="secundario" aria-pressed={Boolean(teclado)} disabled={disabled || !texto} onClick={() => {
      if (teclado) { limpar('modo'); return }
      limpar()
      setTeclado({ ancora: 0, cursor: 0 })
      area.current?.focus()
    }}>Marcar com o teclado</Botao>
    {teclado && <p className="review-caption" role="status">Use as setas para mover, Shift e seta para selecionar, Enter para marcar e Escape para sair.</p>}
    {(aprovados.length > 0 || analise?.status === 'CONCLUIDA') && <ul className="review-evidence-legend" aria-label="Marcações no texto">
      {criterios.map((c) => {
        const quantidade = porCriterio[c.id].marcados.length
        return <li key={c.id} className={`review-tone-${tomCriterio(c)}`}>
          <span className="review-color" aria-hidden="true" />{c.nome}: {quantidade} {quantidade === 1 ? 'trecho marcado' : 'trechos marcados'}
        </li>
      })}
      {analise?.status === 'CONCLUIDA' && pendentes.length > 0 && <li>Sugestões da IA não aprovadas: {pendentes.length}</li>}
    </ul>}
    {aprovados.length > 0 && <p className="review-caption">Os números identificam trechos, não critérios. Um mesmo trecho pode apoiar mais de um critério.</p>}
    <div ref={area} tabIndex={-1} className="review-essay-text" aria-label="Texto da redação" aria-describedby={instrucao} onKeyDown={usarTeclado}>
      {pontos.slice(0, -1).map((inicio, indice) => {
        const fim = pontos[indice + 1]
        const atuais = aprovados.filter((item) => item.inicio <= inicio && item.fim >= fim)
        const sugestoes = pendentes.filter((item) => item.inicio <= inicio && item.fim >= fim)
        const tons = [...new Set(atuais.flatMap((item) => item.criterios.map(tomCriterio)))]
        const tom = tons[0] ?? tomCriterio(sugestoes[0]?.criterios[0] ?? {})
        const selecionado = teclado && intervalo.inicio <= inicio && intervalo.fim >= fim
        return <Fragment key={inicio}>
          {aprovados.filter((item) => item.inicio === inicio).map((item) => selo(item, false))}
          {pendentes.filter((item) => item.inicio === inicio).map((item) => selo(item, true))}
          <span data-inicio={inicio} className={`review-fragment review-tone-${tom}${atuais.length ? ' is-marked' : ''}${sugestoes.length ? ' is-suggested' : ''}${selecionado ? ' is-selected' : ''}${teclado?.cursor === inicio ? ' has-caret' : ''}`}
            style={tons.length > 1 ? {
              backgroundImage: tons.map((t) => `linear-gradient(var(--review-color-${t}),var(--review-color-${t}))`).join(','),
              backgroundSize: '100% 1px', backgroundRepeat: 'no-repeat',
              backgroundPosition: tons.map((_, i) => `left bottom ${i * 2}px`).join(','),
            } : undefined}>{texto.slice(inicio, fim)}</span>
        </Fragment>
      })}
      {teclado?.cursor === texto.length && <span aria-hidden="true" className="review-fragment has-caret" />}
    </div>
    {!texto && <p className="review-caption">O texto desta redação não está disponível.</p>}
    {resumoIa.ambiguas + resumoIa.naoLocalizadas + resumoIa.legadas > 0 &&
      <p className="review-caption">Evidências sem localização confirmada ficam nos detalhes da análise.</p>}
    {mostrarBarra && <section ref={barra} tabIndex={-1} className="review-mark-bar" aria-label="Marcar este trecho em">
      <h3>Marcar este trecho em</h3>
      <AjusteBordas texto={texto} intervalo={proposta} limites={limites} onChange={setAjuste} disabled={disabled} />
      {(!pronto || aviso) && <p role="status" className="review-caption">{aviso || (erroBorda ? 'Ajuste as bordas para não cortar um caractere.' : candidato?.erro)}</p>}
      <div className="review-mark-actions">
        {criterios.map((c) => <Botao key={c.id} variante="secundario" disabled={disabled || !pronto} onClick={() => {
          const motivo = podeAcrescentarTrecho(porCriterio[c.id].marcados, pronto)
          if (motivo) { setAviso(motivo); return }
          onMark(c.id, pronto); limpar(teclado ? 'modo' : 'texto')
        }}>{c.nome}</Botao>)}
        <Botao variante="secundario" onClick={() => limpar(teclado ? 'modo' : 'texto')}>Cancelar marcação</Botao>
      </div>
    </section>}
  </figure>
}
