export function interpretarErroApi(
  error,
  mensagemPadrao,
) {
  const erroApi = error.response?.data?.error
  const detalhes = Array.isArray(erroApi?.details)
    ? erroApi.details
    : []

  const campos = detalhes.reduce(
    (resultado, detalhe) => {
      if (
        detalhe?.field &&
        detalhe?.message &&
        !resultado[detalhe.field]
      ) {
        resultado[detalhe.field] = detalhe.message
      }

      return resultado
    },
    {},
  )

  return {
    mensagem: erroApi?.message ?? mensagemPadrao,
    campos,
  }
}
