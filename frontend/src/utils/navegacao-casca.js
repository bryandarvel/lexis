/*
 * Navegação da casca única (AppShell, Lote 4). Funções puras: dizem quais
 * itens cada papel vê, para onde levam e qual está ativo. O desenho fica no
 * AppShell; aqui não há JSX, para que a regra seja testável sem render.
 *
 * O menu do professor tem três destinos. "Redações", "Propostas" e
 * "Notificações" saíram: as páginas continuam existindo, mas o acesso mudou.
 * As propostas vivem dentro de Turmas, os avisos abrem pelo sino da barra e as
 * redações pendentes continuam no Painel. A decisão D4 da auditoria (Feedbacks
 * dentro de Minhas redações) é do aluno e não entra aqui.
 */

export function rotaInicialDoPapel(papel) {
  return papel === 'PROFESSOR' ? '/professor' : '/aluno'
}

function normalizarCaminho(caminho) {
  const texto = String(caminho ?? '')

  return texto.length > 1 ? texto.replace(/\/+$/, '') : texto
}

// Mesmo critério do NavLink: o destino exato ou qualquer rota abaixo dele.
export function destinoAtivo(caminho, para, exato = false) {
  const atual = normalizarCaminho(caminho)
  const destino = normalizarCaminho(para)

  if (!destino) return false
  if (atual === destino) return true

  return !exato && atual.startsWith(`${destino}/`)
}

function link(chave, rotulo, para, caminho, exato = false) {
  return {
    chave,
    tipo: 'link',
    rotulo,
    para,
    atual: destinoAtivo(caminho, para, exato),
  }
}

function itensDoAluno({ caminho, rotaEnviarRedacao }) {
  return [
    link('inicio', 'Início', '/aluno', caminho, true),
    rotaEnviarRedacao
      ? link('escrever', 'Escrever redação', rotaEnviarRedacao, caminho)
      : {
          chave: 'escrever',
          tipo: 'indisponivel',
          rotulo: 'Escrever redação',
          motivo: 'indisponível: nenhuma proposta pendente',
          atual: false,
        },
    link('redacoes', 'Minhas redações', '/aluno/redacoes', caminho),
    link('feedbacks', 'Feedbacks', '/aluno/feedbacks', caminho),
    link('perfil', 'Perfil', '/aluno/perfil', caminho),
  ]
}

// Uma proposta só existe dentro de uma turma, e é por Turmas que se chega a
// ela: as rotas de /professor/temas marcam "Turmas" no menu.
const ROTAS_DE_TURMAS = ['/professor/turmas', '/professor/temas']

function itensDoProfessor({ caminho }) {
  return [
    link('painel', 'Painel', '/professor', caminho, true),
    {
      ...link('turmas', 'Turmas', '/professor/turmas', caminho),
      atual: ROTAS_DE_TURMAS.some((rota) => destinoAtivo(caminho, rota)),
    },
    link('perfil', 'Perfil', '/professor/perfil', caminho),
  ]
}

export function montarNavegacao({
  papel,
  caminho = '',
  rotaEnviarRedacao = null,
}) {
  return papel === 'PROFESSOR'
    ? itensDoProfessor({ caminho })
    : itensDoAluno({ caminho, rotaEnviarRedacao })
}

// Rótulo do sino, igual nos dois papéis para a mesma contagem (UX-009).
export function descreverAvisosNaoLidos(total) {
  const quantidade = Number.isInteger(total) && total > 0 ? total : 0

  if (quantidade === 0) return 'Notificações: nenhum aviso não lido'
  if (quantidade === 1) return 'Notificações: 1 aviso não lido'

  return `Notificações: ${quantidade} avisos não lidos`
}

export function formatarContagemDoSino(total) {
  return total > 99 ? '99+' : String(total)
}

// A trilha aceita texto simples ou { rotulo, para }. O último item é a página atual.
export function normalizarTrilha(itens) {
  const lista = (Array.isArray(itens) ? itens : [])
    .map((item) =>
      typeof item === 'string'
        ? { rotulo: item, para: null }
        : { rotulo: item?.rotulo ?? '', para: item?.para ?? null },
    )
    .filter((item) => String(item.rotulo).trim() !== '')

  return lista.map((item, indice) => {
    const atual = indice === lista.length - 1

    return { ...item, para: atual ? null : item.para, atual }
  })
}
