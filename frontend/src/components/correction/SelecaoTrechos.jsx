import { useMemo, useRef, useState } from 'react'
import Botao from '../base/Botao.jsx'
import { LIMITE_OFFSET, LIMITE_TRECHOS_POR_CRITERIO, chaveTrecho, criarTrechoDaSelecao, limitesDeGrafemas, moverGrafema, podeAcrescentarTrecho } from '../../utils/trechos-feedback.js'
import { chaveSugestao } from '../../utils/professor-correction.js'
import './selecao-trechos.css'

export function AjusteBordas({ texto, intervalo, limites, onChange, disabled }) {
  const { inicio, fim } = intervalo
  function ajustar(campo, direcao) {
    const proximo = moverGrafema(limites, intervalo[campo], direcao)
    return { inicio, fim, [campo]: proximo }
  }
  return <>
    <p className="trechos-preview"><strong>Prévia:</strong> <q>{texto.slice(inicio, fim)}</q> <small>({inicio}–{fim})</small></p>
    <div className="trechos-bordas" aria-label="Ajustar bordas por caractere">
      {[
        ['inicio', -1, 'Recuar início'], ['inicio', 1, 'Avançar início'],
        ['fim', -1, 'Recuar fim'], ['fim', 1, 'Avançar fim'],
      ].map(([campo, direcao, rotulo]) => {
        const proximo = ajustar(campo, direcao)
        return <Botao key={rotulo} variante="secundario" disabled={disabled || proximo[campo] === intervalo[campo] ||
          proximo.fim <= proximo.inicio || (proximo.fim > LIMITE_OFFSET && proximo.fim >= fim)}
          onClick={() => onChange(proximo)}>{rotulo}</Botao>
      })}
    </div>
  </>
}

export default function SelecaoTrechos({ texto, criterio, marcados, sugestoes, numeros, salvando, onAlterar, onDescartar, onVerNoTexto }) {
  const [edicao, setEdicao] = useState(null)
  const [aviso, setAviso] = useState('')
  const painel = useRef(null)
  const limites = useMemo(() => limitesDeGrafemas(texto), [texto])
  const cheio = marcados.length >= LIMITE_TRECHOS_POR_CRITERIO
  const chaveEditada = edicao?.chave
  const trechoEditado = marcados.find((item) => chaveTrecho(item) === chaveEditada)
  const outros = chaveEditada ? marcados.filter((item) => chaveTrecho(item) !== chaveEditada) : marcados
  const novo = edicao && limites.includes(edicao.intervalo.inicio) && limites.includes(edicao.intervalo.fim) &&
    criarTrechoDaSelecao(texto, edicao.intervalo.inicio, edicao.intervalo.fim).trecho
  const impedimento = novo && podeAcrescentarTrecho(outros, novo)

  function cancelar() {
    const botao = painel.current?.querySelector('[data-edicao-ativa]')
    setEdicao(null)
    botao?.focus()
  }

  return <section className="trechos-painel" ref={painel} aria-label={`Trechos de ${criterio.nome}`} onKeyDown={(event) => {
    if (event.key === 'Escape' && edicao) { event.preventDefault(); cancelar() }
  }}>
    <h4>Trechos marcados <small>{marcados.length}/{LIMITE_TRECHOS_POR_CRITERIO}</small></h4>
    {!marcados.length && <p className="review-caption">Nenhum trecho marcado.</p>}
    {cheio && <p className="review-caption">Limite atingido. Remova um trecho para marcar outro.</p>}
    <ul className="trechos-lista">
      {marcados.map((item) => {
        const chave = chaveTrecho(item)
        return <li key={chave} id={`review-mark-${criterio.id}-${chave}`} tabIndex={-1}>
          <q><strong>{numeros.get(chave)} </strong>{item.trecho}</q>
          <div className="review-mark-actions">
            <Botao variante="secundario" onClick={() => onVerNoTexto(item)}>Ver no texto<span className="sr-only">, trecho {numeros.get(chave)}</span></Botao>
            <Botao variante="secundario" disabled={salvando} aria-expanded={chave === chaveEditada}
              data-edicao-ativa={chave === chaveEditada ? '' : undefined}
              onClick={() => setEdicao((atual) => atual?.chave === chave ? null : { chave, intervalo: { inicio: item.inicio, fim: item.fim } })}>Ajustar bordas<span className="sr-only">, trecho {numeros.get(chave)}</span></Botao>
            <Botao variante="secundario" disabled={salvando} onClick={() => {
              onAlterar(marcados.filter((t) => chaveTrecho(t) !== chave)); setEdicao(null); setAviso('Trecho removido do rascunho.')
              document.getElementById(`review-comment-${criterio.id}`)?.focus()
            }}>Remover trecho<span className="sr-only"> {numeros.get(chave)}</span></Botao>
          </div>
          {chave === chaveEditada && <div className="trechos-edicao">
            <AjusteBordas texto={texto} intervalo={edicao.intervalo} limites={limites}
              onChange={(intervalo) => setEdicao({ chave, intervalo })} disabled={salvando} />
            {impedimento && <p role="status" className="review-caption">{impedimento}</p>}
            <div className="review-mark-actions">
              <Botao disabled={salvando || !novo || Boolean(impedimento)} onClick={() => {
                const igual = chaveTrecho(novo) === chave
                onAlterar([...outros, igual ? trechoEditado : novo])
                setEdicao(null); setAviso('Trecho atualizado no rascunho.')
                document.getElementById(`review-comment-${criterio.id}`)?.focus()
              }}>Confirmar ajuste</Botao>
              <Botao variante="secundario" onClick={cancelar}>Cancelar ajuste</Botao>
            </div>
          </div>}
        </li>
      })}
    </ul>
    {sugestoes.length > 0 && <details className="trechos-sugestoes" open>
      <summary>Sugestões da IA não publicadas</summary>
      <ul className="trechos-lista">
        {sugestoes.map((item) => {
          const chave = chaveSugestao(criterio.id, item)
          return <li key={chave} id={`review-suggestion-${chave}`} tabIndex={-1}>
            <q>{item.trecho}</q>
            <div className="review-mark-actions">
              <Botao variante="secundario" disabled={salvando || cheio} aria-label={`Aprovar trecho: ${item.trecho.slice(0, 100)}`} onClick={() => {
                if (podeAcrescentarTrecho(marcados, item)) return
                onAlterar([...marcados, item]); setAviso('Sugestão marcada no rascunho.')
                document.getElementById(`review-comment-${criterio.id}`)?.focus()
              }}>Aprovar trecho</Botao>
              <Botao variante="secundario" disabled={salvando} aria-label={`Descartar sugestão: ${item.trecho.slice(0, 100)}`} onClick={() => {
                onDescartar(chave); setAviso('Sugestão descartada nesta tela. Ela volta ao recarregar.')
                document.getElementById(`review-comment-${criterio.id}`)?.focus()
              }}>Descartar sugestão</Botao>
            </div>
          </li>
        })}
      </ul>
      <p className="review-caption">Descartar só vale nesta tela. A sugestão volta ao recarregar.</p>
    </details>}
    <p className="sr-only" role="status">{aviso}</p>
  </section>
}
