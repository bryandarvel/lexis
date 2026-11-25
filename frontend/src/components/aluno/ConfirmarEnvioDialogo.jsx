import DialogoConfirmacao from '../base/DialogoConfirmacao.jsx'

export default function ConfirmarEnvioDialogo({
  aberto,
  extensao,
  pendentes,
  onCancelar,
  onConfirmar,
}) {
  return (
    <DialogoConfirmacao
      aberto={aberto}
      titulo="Enviar a redação?"
      descricao="O envio é definitivo: depois de entregar, o texto não pode mais ser editado."
      confirmarRotulo="Enviar definitivamente"
      cancelarRotulo="Voltar ao texto"
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
    >
      <p className="text-sm font-medium leading-[22px] text-texto">{extensao}</p>

      {pendentes.length > 0 && (
        <div className="mt-4 rounded-controle bg-superficie-rebaixada p-3">
          <p className="text-xs font-semibold leading-[17px] text-texto">
            Itens não marcados em “Antes de enviar”:
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs leading-[17px] text-texto-suave">
            {pendentes.map((item) => (
              <li key={item.id}>{item.rotulo}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-[17px] text-texto-suave">
            A conferência é pessoal e não impede o envio.
          </p>
        </div>
      )}
    </DialogoConfirmacao>
  )
}
