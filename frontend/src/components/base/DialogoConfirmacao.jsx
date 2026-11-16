import Botao from './Botao.jsx'
import Dialogo from './Dialogo.jsx'

/*
 * Confirmação de ação importante (Lote 3a). Substitui window.confirm: mostra o
 * que vai acontecer em uma lista de efeitos e põe o foco inicial no botão que
 * NÃO executa a ação. `perigo` troca o botão de confirmar para a variante de
 * ação destrutiva.
 */
export default function DialogoConfirmacao({
  aberto,
  titulo,
  descricao,
  efeitos = [],
  confirmarRotulo,
  cancelarRotulo = 'Cancelar',
  perigo = false,
  ocupado = false,
  onConfirmar,
  onCancelar,
  children,
}) {
  return (
    <Dialogo
      aberto={aberto}
      onFechar={ocupado ? undefined : onCancelar}
      titulo={titulo}
      descricao={descricao}
      rodape={
        <>
          <Botao
            variante="secundario"
            autoFocus
            disabled={ocupado}
            onClick={onCancelar}
          >
            {cancelarRotulo}
          </Botao>
          <Botao
            variante={perigo ? 'perigo' : 'primario'}
            carregando={ocupado}
            onClick={onConfirmar}
          >
            {confirmarRotulo}
          </Botao>
        </>
      }
    >
      {efeitos.length > 0 && (
        <ul className="dialogo-base__efeitos">
          {efeitos.map((efeito) => (
            <li key={efeito}>{efeito}</li>
          ))}
        </ul>
      )}
      {children && <div className="mt-4">{children}</div>}
    </Dialogo>
  )
}
