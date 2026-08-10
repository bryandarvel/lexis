export function notFoundHandler(req, res) {
  return res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Rota não encontrada.',
      method: req.method,
      path: req.originalUrl,
    },
  })
}