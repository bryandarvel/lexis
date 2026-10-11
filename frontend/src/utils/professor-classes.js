function normalizarBusca(valor) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

export function filtrarTurmas(turmas, busca = '', filtro = 'todas') {
  const termo = normalizarBusca(busca)
  return turmas.filter((turma) => {
    if (filtro === 'ativas' && !turma.ativa) return false
    if (filtro === 'arquivadas' && turma.ativa) return false
    return normalizarBusca(`${turma.nome} ${turma.codigoAcesso}`).includes(termo)
  })
}

export function resumirRedacoesTurma(redacoes) {
  const pendentes = redacoes.filter((redacao) => redacao.status === 'ENVIADA').length
  const avaliadas = redacoes.filter((redacao) => redacao.status === 'AVALIADA').length
  const total = pendentes + avaliadas
  return { pendentes, avaliadas, total, progresso: total ? Math.round(avaliadas / total * 100) : 0 }
}

export function prepararNomeTurma(valor) {
  const nome = valor.trim()
  if (nome.length < 2) return { erro: 'Informe um nome com pelo menos 2 caracteres.' }
  if (nome.length > 100) return { erro: 'O nome deve possuir no máximo 100 caracteres.' }
  return { nome: nome.replace(/\s+/g, ' ') }
}
