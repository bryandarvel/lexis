export function obterIniciais(nome = '') {
  return nome.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((parte) => Array.from(parte)[0]).join('').toUpperCase() || 'PR'
}

export function diasDesdeEnvio(enviadaEm, agora = new Date()) {
  if (!enviadaEm) return null
  const envio = new Date(enviadaEm)
  if (Number.isNaN(envio.getTime())) return null
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const inicioEnvio = new Date(envio.getFullYear(), envio.getMonth(), envio.getDate())
  return Math.max(0, Math.round((inicioHoje - inicioEnvio) / 86400000))
}

export function resumirPainelProfessor(turmas, redacoes, feedbacks, agora = new Date()) {
  const ativas = turmas.filter((turma) => turma.ativa)
  const pendentes = redacoes.filter((redacao) => redacao.status === 'ENVIADA')
    .sort((a, b) => {
      const dataA = a.enviadaEm ? new Date(a.enviadaEm).getTime() : NaN
      const dataB = b.enviadaEm ? new Date(b.enviadaEm).getTime() : NaN
      return (Number.isFinite(dataA) ? dataA : Infinity) - (Number.isFinite(dataB) ? dataB : Infinity)
    })
  const publicadasNoMes = feedbacks === null ? null : feedbacks.filter((feedback) =>
    feedback?.historico?.some((versao) => {
      if (!['PUBLICADA', 'SUBSTITUIDA'].includes(versao.status) || !versao.publicadoEm) return false
      const data = new Date(versao.publicadoEm)
      return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
    }),
  ).length
  return {
    turmasAtivas: ativas.length,
    alunosCadastrados: ativas.reduce((total, turma) => total + (turma.quantidadeAlunosAtivos ?? 0), 0),
    pendentes,
    publicadasNoMes,
  }
}
