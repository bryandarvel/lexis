/*
 * Decide as props de estado do Botao (Lote 3a). Fica fora do componente para
 * ser testada sem DOM.
 *
 * Botão nativo: usa `disabled`. Qualquer outro elemento (link): aria-disabled
 * não impede a navegação, então, quando desabilitado ou carregando, tira href e
 * to, sai da ordem de Tab e bloqueia o clique sem chamar o onClick original.
 */
export function resolverPropsBotao({
  nativo,
  desabilitado,
  carregando = false,
  type,
  onClick,
  resto = {},
}) {
  const bloqueado = Boolean(desabilitado) || Boolean(carregando)

  if (nativo) {
    return { ...resto, type: type ?? 'button', disabled: bloqueado, onClick }
  }

  if (!bloqueado) {
    return { ...resto, onClick }
  }

  // eslint-disable-next-line no-unused-vars
  const { href, to, ...semDestino } = resto

  return {
    ...semDestino,
    'aria-disabled': true,
    tabIndex: -1,
    onClick: (evento) => {
      evento.preventDefault()
      evento.stopPropagation()
    },
  }
}
