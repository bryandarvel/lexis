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

/*
 * Situação por turma (Issue #178). Tudo sai do que o painel já carrega: a
 * fila de redações da turma e o resumoEntregas que a mesma rota devolve.
 * `aguardando` e `corrigidas` são contagens de redação; `espera` é há quantos
 * dias está a pendente mais antiga, que é o que decide a urgência.
 */
export function resumirTurma(turma, redacoes, entrega, agora = new Date()) {
  const daTurma = redacoes.filter((redacao) => redacao.turma?.id === turma?.id)
  const aguardando = daTurma.filter((redacao) => redacao.status === 'ENVIADA')
  const esperas = aguardando
    .map((redacao) => diasDesdeEnvio(redacao.enviadaEm, agora))
    .filter((dias) => dias !== null)

  return {
    id: turma?.id,
    nome: turma?.nome ?? 'Turma',
    aguardando: aguardando.length,
    corrigidas: daTurma.filter((redacao) => redacao.status === 'AVALIADA').length,
    espera: esperas.length ? Math.max(...esperas) : null,
    alunosAtivos: entrega?.totalAlunosAtivos ?? turma?.quantidadeAlunosAtivos ?? 0,
    // Nulo quando a turma não respondeu o resumo: melhor não mostrar do que
    // mostrar zero como se ninguém tivesse entregado.
    entregaram: entrega ? entrega.alunosAtivosQueEntregaram : null,
  }
}

export function resumirPainelProfessor(turmas, redacoes, feedbacks, agora = new Date(), entregas = {}) {
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
    // A turma arquivada sai: não há o que corrigir nem entregar nela.
    porTurma: ativas
      .map((turma) => resumirTurma(turma, redacoes, entregas[turma.id], agora))
      .sort((a, b) => b.aguardando - a.aguardando || (b.espera ?? -1) - (a.espera ?? -1)),
  }
}

export function descreverEspera(dias) {
  if (dias === null || dias === undefined) return '—'
  if (dias === 0) return 'hoje'

  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`
}

/*
 * Os quatro indicadores do topo do painel (Issue #178). "Correções no mês"
 * vira travessão quando o histórico não respondeu: zero ali seria mentira.
 */
export function descreverIndicadoresDoPainel(painel) {
  return [
    { rotulo: 'Aguardando correção', valor: String(painel?.pendentes?.length ?? 0) },
    { rotulo: 'Correções no mês', valor: painel?.publicadasNoMes === null || painel?.publicadasNoMes === undefined ? '—' : String(painel.publicadasNoMes) },
    { rotulo: 'Turmas ativas', valor: String(painel?.turmasAtivas ?? 0) },
    { rotulo: 'Alunos ativos', valor: String(painel?.alunosCadastrados ?? 0) },
  ]
}

export function descreverSituacaoDaTurma(turma) {
  const aguardando = turma?.aguardando ?? 0

  return [
    { rotulo: 'Aguardando', valor: String(aguardando), tom: aguardando > 0 ? 'atencao' : 'neutro' },
    { rotulo: 'Corrigidas', valor: String(turma?.corrigidas ?? 0), tom: 'neutro' },
    { rotulo: 'Pendente mais antiga', valor: descreverEspera(turma?.espera), tom: (turma?.espera ?? 0) >= 5 ? 'atraso' : 'neutro' },
    {
      rotulo: 'Entregaram',
      valor: turma?.entregaram === null || turma?.entregaram === undefined
        ? '—'
        : `${turma.entregaram} de ${turma.alunosAtivos ?? 0}`,
      tom: 'neutro',
    },
  ]
}
