import { useEffect, useRef, useState } from 'react'
import Aviso from '../base/Aviso.jsx'
import Botao from '../base/Botao.jsx'
import Campo from '../base/Campo.jsx'
import Dialogo from '../base/Dialogo.jsx'

export default function CriterionDialog({ inicial, proposta, salvando, erro, onSave, onCancel }) {
  const erroRef = useRef(null)
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')

  useEffect(() => {
    if (erro && !salvando) erroRef.current?.focus()
  }, [erro, salvando])

  return (
    <Dialogo
      aberto
      onFechar={() => { if (!salvando) onCancel() }}
      titulo={inicial ? 'Editar critério' : 'Adicionar critério'}
      descricao={`Competência II · proposta “${proposta}”`}
    >
      <form onSubmit={(event) => { event.preventDefault(); if (!salvando) onSave({ nome, descricao }) }} aria-busy={salvando} className="space-y-4">
        <Campo id="criterion-name" label="Nome" name="nome" required minLength={2} maxLength={120} value={nome} disabled={salvando}
          autoComplete="off" onChange={(event) => setNome(event.target.value)} />
        <Campo id="criterion-description" label="O que a IA deve procurar" name="descricao" multilinha required minLength={5} maxLength={2000} rows={2}
          value={descricao} disabled={salvando} onChange={(event) => setDescricao(event.target.value)} />
        <p className="text-xs leading-[17px] text-texto-fraco">Este critério orienta a análise do repertório pela IA. Não possui peso e não calcula a nota.</p>
        {erro && <div ref={erroRef} tabIndex={-1}><Aviso tipo="erro">{erro}</Aviso></div>}
        <div className="dialogo-base__rodape">
          <Botao variante="secundario" disabled={salvando} onClick={onCancel}>Cancelar</Botao>
          <Botao type="submit" carregando={salvando} rotuloCarregando="Salvando…">Salvar</Botao>
        </div>
        <span className="sr-only" role="status">{salvando ? 'Salvando critério. Aguarde.' : ''}</span>
      </form>
    </Dialogo>
  )
}
