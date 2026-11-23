import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import Botao from '../base/Botao.jsx'
import { chaveTrecho, criarTrechoDaSelecao, criteriosComOTrecho, descreverTrechoJaMarcado, LIMITE_TRECHOS_POR_CRITERIO, lerIntervaloSelecionado, limitesDeGrafemas, marcacoesQueASelecaoToca, moverGrafema, podeAcrescentarTrecho, recortarMarcacoes } from '../../utils/trechos-feedback.js'
import { tomCriterio } from '../../utils/professor-correction.js'
import { resumirEvidencias } from '../../utils/ai-evidence.js'
import { obterTomDaMarca } from '../../utils/criterio-cores.js'
import { AjusteBordas } from './SelecaoTrechos.jsx'
import VinculosDoTrecho from './VinculosDoTrecho.jsx'

export default function EssayEvidenceText({ texto = '', criterios, marcacoes, analise, onMark, onUnmark, onEvidence, disabled, vinculo }) {
  const instrucao = useId()
  const area = useRef(null)
  const modoRef = useRef(null)
  const barra = useRef(null)
  const ultimaSelecao = useRef(null)
  const apontouNaBarra = useRef(false)
  const arrastando = useRef(false)
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
  const jaMarcadoEm = criteriosComOTrecho(criterios, porCriterio, pronto)
  // "Remover trecho" age sobre tudo que a seleção toca, idêntico ou não (Issue #190).
  const aRemover = marcacoesQueASelecaoToca(criterios, porCriterio, pronto)

  /*
   * A barra acompanha a seleção: aparece quando há uma e sai quando ela
   * acaba. Perder a seleção não podia fechá-la enquanto o clique era dentro
   * da própria barra — o navegador limpa a seleção já no apontar, e a barra
   * sumiria antes de o clique chegar ao botão. Por isso o apontar marca onde
   * começou, e só aí a ausência de seleção conta.
   */
  useEffect(() => {
    if (teclado || disabled) return undefined
    /*
     * Issue #190. Durante o arrasto do mouse a seleção ainda não terminou, e a
     * barra (sticky, no pé da área rolável) aparecia por cima do texto no meio
     * do gesto. O ponteiro passava a ficar sobre ela, o fim da seleção caía fora
     * do texto, a leitura devolvia nulo, a barra sumia, a seleção voltava e a
     * barra reaparecia: a tela tremia e o scroll pulava. Enquanto o botão está
     * apertado dentro do texto, a seleção só é lida quando ele é solto.
     */
    const consultar = (evento) => {
      if (arrastando.current && evento?.type === 'selectionchange') return
      const selecionado = lerIntervaloSelecionado(area.current, document.getSelection())
      if (!selecionado) {
        if (apontouNaBarra.current || !ultimaSelecao.current) return
        ultimaSelecao.current = null
        setNativa(null)
        setAjuste(null)
        setAviso('')
        return
      }
      if (ultimaSelecao.current?.inicio === selecionado.inicio && ultimaSelecao.current?.fim === selecionado.fim) return
      ultimaSelecao.current = selecionado
      setNativa(selecionado)
      setAjuste(null)
      setAviso('')
    }
    const aoApontar = (evento) => {
      apontouNaBarra.current = Boolean(barra.current?.contains(evento.target))
      arrastando.current = evento.button === 0 && Boolean(area.current?.contains(evento.target))
      // Clique em qualquer outro lugar da tela fecha a barra (Issue #179).
      if (!apontouNaBarra.current && !area.current?.contains(evento.target)) limpar()
    }
    const soltou = (evento) => { arrastando.current = false; consultar(evento) }
    const desistiu = () => { arrastando.current = false }
    const eventos = ['selectionchange', 'touchend', 'keyup']
    eventos.forEach((evento) => document.addEventListener(evento, consultar))
    document.addEventListener('pointerup', soltou)
    document.addEventListener('pointercancel', desistiu)
    window.addEventListener('blur', desistiu)
    document.addEventListener('pointerdown', aoApontar, true)
    return () => {
      arrastando.current = false
      eventos.forEach((evento) => document.removeEventListener(evento, consultar))
      document.removeEventListener('pointerup', soltou)
      document.removeEventListener('pointercancel', desistiu)
      window.removeEventListener('blur', desistiu)
      document.removeEventListener('pointerdown', aoApontar, true)
    }
  }, [teclado, disabled])

  useEffect(() => {
    if (teclado) area.current?.querySelector('.has-caret')?.scrollIntoView({ block: 'nearest' })
  }, [teclado])

  function limpar(foco) {
    if (lerIntervaloSelecionado(area.current, document.getSelection())) document.getSelection().removeAllRanges()
    ultimaSelecao.current = null
    apontouNaBarra.current = false
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
      id={pendente ? undefined : `review-selo-${chaveTrecho(item)}`}
      className={`review-seal review-tone-${obterTomDaMarca(item.criterios.map((c) => c.ordem))}${pendente ? ' is-pending' : ''}`}
      data-numero={pendente ? 'IA' : item.numero} data-marca={!pendente ? chaveTrecho(item) : undefined}
      aria-label={`${pendente ? 'Sugestão da IA não aprovada' : `Trecho ${item.numero}`}: ${item.criterios.map((c) => c.nome).join(', ')}. ${item.trecho.slice(0, 100)}`}
      aria-pressed={pendente ? undefined : Boolean(vinculo?.chaves.includes(chaveTrecho(item)))}
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
    {vinculo?.destinos.length > 1 && <VinculosDoTrecho vinculo={vinculo} />}
    <div ref={area} tabIndex={-1} className="review-essay-text" aria-label="Texto da redação" aria-describedby={instrucao} onKeyDown={usarTeclado}>
      {pontos.slice(0, -1).map((inicio, indice) => {
        const fim = pontos[indice + 1]
        const atuais = aprovados.filter((item) => item.inicio <= inicio && item.fim >= fim)
        const sugestoes = pendentes.filter((item) => item.inicio <= inicio && item.fim >= fim)
        const tons = [...new Set(atuais.flatMap((item) => item.criterios.map(tomCriterio)))]
        const tom = tons[0] ?? tomCriterio(sugestoes[0]?.criterios[0] ?? {})
        const selecionado = teclado && intervalo.inicio <= inicio && intervalo.fim >= fim
        const relacionado = atuais.some((item) => vinculo?.chaves.includes(chaveTrecho(item)))
        return <Fragment key={inicio}>
          {aprovados.filter((item) => item.inicio === inicio).map((item) => selo(item, false))}
          {pendentes.filter((item) => item.inicio === inicio).map((item) => selo(item, true))}
          <span data-inicio={inicio} className={`review-fragment review-tone-${tom}${atuais.length ? ' is-marked' : ''}${sugestoes.length ? ' is-suggested' : ''}${selecionado ? ' is-selected' : ''}${relacionado ? ' trecho-em-foco' : ''}${teclado?.cursor === inicio ? ' has-caret' : ''}`}
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
      {/*
        * Issue #179: a barra mostra primeiro as opções de critério, cada uma
        * com a cor que o trecho vai receber no texto. O ajuste de bordas
        * continua disponível, recolhido, e abre sozinho quando a seleção corta
        * um caractere — que é quando ele é necessário.
        */}
      {jaMarcadoEm.length > 0 && <p role="status" className="review-caption">{descreverTrechoJaMarcado(jaMarcadoEm)}</p>}
      {(!pronto || aviso) && <p role="status" className="review-caption">{aviso || (erroBorda ? 'Ajuste as bordas para não cortar um caractere.' : candidato?.erro)}</p>}
      <div className="review-mark-actions review-mark-opcoes">
        {criterios.map((c) => {
          const repetido = jaMarcadoEm.some((item) => item.id === c.id)

          return <Botao key={c.id} variante="secundario" className={`review-mark-opcao review-tone-${tomCriterio(c)}`}
            disabled={disabled || !pronto || repetido}
            title={repetido ? 'Este trecho já está marcado neste critério.' : undefined}
            onClick={() => {
              const motivo = podeAcrescentarTrecho(porCriterio[c.id].marcados, pronto)
              if (motivo) { setAviso(motivo); return }
              onMark(c.id, pronto); limpar(teclado ? 'modo' : 'texto')
            }}>
            <span aria-hidden="true" className="review-color" />{c.nome}
            {repetido && <span className="sr-only">, já marcado neste critério</span>}
          </Botao>
        })}
      </div>
      {/*
        * Issue #179: "Cancelar marcação" saiu. Ele cancelava o ato de marcar,
        * fechando a barra, mas era lido como "cancelar a marcação que existe"
        * — e a remoção só morava no painel de trechos. Agora o trecho já
        * marcado é removido daqui, e fechar a barra é clicar fora (ou Escape).
        */}
      <div className="review-mark-actions">
        <Botao variante="perigo" disabled={disabled || aRemover.length === 0}
          title={aRemover.length === 0 ? 'A seleção não toca em nenhum trecho marcado.' : undefined}
          onClick={() => {
            // Issue #190: um só botão; recorta a seleção de toda marcação que ela toca, em
            // qualquer critério, e o que ficar fora dela continua marcado.
            const planos = aRemover.map(({ criterio }) => ({ criterio, lista: recortarMarcacoes(texto, porCriterio[criterio.id].marcados, pronto) }))
            const estoura = planos.find((plano) => plano.lista.length > LIMITE_TRECHOS_POR_CRITERIO)
            if (estoura) {
              setAviso(`Remover só essa parte deixaria ${estoura.criterio.nome} com mais de ${LIMITE_TRECHOS_POR_CRITERIO} trechos. Remova algum antes.`)
              return
            }
            planos.forEach(({ criterio, lista }) => onUnmark(criterio.id, lista))
            limpar(teclado ? 'modo' : 'texto')
          }}>Remover trecho</Botao>
      </div>
      <details className="review-mark-bordas" open={Boolean(erroBorda)}>
        <summary>Ajustar bordas</summary>
        <AjusteBordas texto={texto} intervalo={proposta} limites={limites} onChange={setAjuste} disabled={disabled} />
      </details>
    </section>}
  </figure>
}
