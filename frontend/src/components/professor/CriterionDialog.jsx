import { useEffect, useRef, useState } from 'react'
import './criterion-dialog.css'

export default function CriterionDialog({ inicial, proposta, salvando, erro, onSave, onCancel }) {
  const dialogRef = useRef(null)
  const erroRef = useRef(null)
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    if (erro && !salvando) erroRef.current?.focus()
  }, [erro, salvando])

  return (
    <dialog ref={dialogRef} className="criterion-dialog" aria-labelledby="criterion-dialog-title" aria-describedby="criterion-dialog-context"
      onCancel={(event) => { event.preventDefault(); if (!salvando) onCancel() }}>
      <h2 id="criterion-dialog-title">{inicial ? 'Editar critério' : 'Adicionar critério'}</h2>
      <p id="criterion-dialog-context" className="criterion-dialog-context">Competência II · proposta “{proposta}”</p>
      <form onSubmit={(event) => { event.preventDefault(); if (!salvando) onSave({ nome, descricao }) }} aria-busy={salvando}>
        <label htmlFor="criterion-name">Nome</label>
        <input id="criterion-name" name="nome" required minLength={2} maxLength={120} value={nome} disabled={salvando}
          autoComplete="off" onChange={(event) => setNome(event.target.value)} />
        <label htmlFor="criterion-description">O que a IA deve procurar</label>
        <textarea id="criterion-description" name="descricao" required minLength={5} maxLength={2000} rows={2}
          value={descricao} disabled={salvando} onChange={(event) => setDescricao(event.target.value)} />
        <label htmlFor="criterion-weight">Peso na Competência II</label>
        <div className="criterion-weight-row">
          <input id="criterion-weight" value="—" disabled aria-describedby="criterion-weight-hint" />
          <p id="criterion-weight-hint">Indisponível nesta versão. O sistema ainda não aplica pesos aos critérios.</p>
        </div>
        <p className="criterion-dialog-note">Critério personalizado · aprovação administrativa prevista para uma etapa futura.</p>
        {erro && <p ref={erroRef} tabIndex={-1} role="alert" className="criterion-dialog-error">{erro}</p>}
        <div className="criterion-dialog-actions">
          <button type="button" className="panel-soft-button criterion-cancel" disabled={salvando} onClick={onCancel}>Cancelar</button>
          <button type="submit" className="panel-primary-button" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
        <span className="sr-only" role="status">{salvando ? 'Salvando critério. Aguarde.' : ''}</span>
      </form>
    </dialog>
  )
}
