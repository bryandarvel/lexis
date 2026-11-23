import Aviso from '../base/Aviso.jsx'
import Botao from '../base/Botao.jsx'
import DialogoConfirmacao from '../base/DialogoConfirmacao.jsx'

export function AcaoExclusaoDefinitiva({ motivo, idMotivo, ocupado, onAbrir }) {
  return <div className="grid justify-items-start gap-2">
    <Botao type="button" variante="perigo" disabled={Boolean(motivo) || ocupado}
      aria-describedby={motivo ? idMotivo : undefined} onClick={onAbrir}>Excluir definitivamente</Botao>
    {motivo && <p id={idMotivo} className="text-sm text-texto-suave">{motivo}</p>}
  </div>
}

export function ConfirmarExclusaoDefinitiva({ tipo, nome, ocupado, erro, onConfirmar, onCancelar }) {
  return <DialogoConfirmacao aberto titulo={`Excluir esta ${tipo}?`}
    resumo={<p className="wrap-anywhere">{nome}</p>}
    efeitos={[`A ${tipo} será removida da sua lista. Esta ação não pode ser desfeita.`]}
    confirmarRotulo={ocupado ? 'Excluindo…' : 'Excluir definitivamente'} ocupado={ocupado}
    perigo rodapeSeparado onConfirmar={onConfirmar} onCancelar={onCancelar}>
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
  </DialogoConfirmacao>
}
