import { useLayoutEffect, useMemo, useRef } from 'react'
import { segmentarSugestoesLinguisticas } from '../../utils/essay-editor.js'
import './campo-redacao.css'

export default function CampoRedacao({ texto, sugestoes, textareaRef, ...props }) {
  const espelho = useRef(null)
  const partes = useMemo(
    () => sugestoes?.length ? segmentarSugestoesLinguisticas(texto, sugestoes) : [],
    [texto, sugestoes],
  )
  const marcar = partes.some((parte) => parte.marcada)

  function sincronizar(campo) {
    if (!espelho.current || !campo) return
    // clientWidth não inclui a barra de rolagem nativa do textarea.
    espelho.current.style.inlineSize = `${campo.clientWidth}px`
    espelho.current.scrollTop = campo.scrollTop
    espelho.current.scrollLeft = campo.scrollLeft
  }

  useLayoutEffect(() => {
    const campo = textareaRef.current
    if (!marcar || !campo) return
    sincronizar(campo)
    const observador = new ResizeObserver(() => sincronizar(campo))
    observador.observe(campo)
    return () => observador.disconnect()
  }, [marcar, partes, textareaRef])

  return (
    <div className="campo-redacao mt-[17px]">
      {marcar && (
        <div ref={espelho} className="campo-redacao-tipografia campo-redacao-espelho fonte-redacao" aria-hidden="true">
          {partes.map((parte) => parte.marcada
            ? <mark key={parte.inicio}>{parte.texto}</mark>
            : <span key={parte.inicio}>{parte.texto}</span>)}
          {texto.endsWith('\n') ? '\u200b' : null}
        </div>
      )}
      <textarea
        {...props}
        ref={textareaRef}
        value={texto}
        onScroll={(evento) => sincronizar(evento.currentTarget)}
        className="campo-redacao-tipografia campo-redacao-controle fonte-redacao min-h-[348px] w-full flex-1 resize-none bg-transparent text-texto placeholder:text-texto-fraco read-only:cursor-default"
      />
    </div>
  )
}
