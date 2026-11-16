/*
 * Estado vazio (Lote 3a): diz o que não existe e, quando houver, o próximo
 * passo. O título é Inter (regra de títulos, D2); `nivel` ajusta o nível do
 * cabeçalho à posição na página.
 */
export default function EstadoVazio({ titulo, descricao, acao, nivel = 2, className = '' }) {
  const Titulo = `h${nivel}`

  return (
    <div
      className={`rounded-cartao border border-dashed border-borda-forte bg-superficie-rebaixada px-6 py-8 text-center ${className}`}
    >
      <Titulo className="fonte-interface text-base font-semibold leading-6 text-texto">
        {titulo}
      </Titulo>
      {descricao && (
        <p className="mx-auto mt-1 max-w-prose text-sm leading-6 text-texto-suave">{descricao}</p>
      )}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  )
}
