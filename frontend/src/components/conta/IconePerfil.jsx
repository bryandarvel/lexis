const desenhos = {
  conta: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  senha: 'M14 3a6 6 0 1 1-3 11L4 21H2v-4l7-7a6 6 0 0 1 5-7ZM16 7h.01',
  turma: 'M3 4h18v12H3zM12 16v4m-4 1 4-2 4 2',
  excluir: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
}

export default function IconePerfil({ tipo }) {
  return <svg aria-hidden="true" focusable="false" className="mr-2 inline-block align-middle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={desenhos[tipo]} /></svg>
}
