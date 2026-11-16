/*
 * Navegação da casca única (AppShell, Lote 4). Funções puras: dizem quais
 * itens cada papel vê, para onde levam e qual está ativo. O desenho fica no
 * AppShell; aqui não há JSX, para que a regra seja testável sem render.
 *
 * Os itens são os mesmos que cada papel já tinha antes da casca única. As
 * decisões D3 e D4 da auditoria (Correções como destino do professor e
 * Feedbacks dentro de Minhas redações) não entram aqui.
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
      ? link('escrever', 'Enviar redação', rotaEnviarRedacao, caminho)
      : {
          chave: 'escrever',
          tipo: 'indisponivel',
          rotulo: 'Enviar redação',
          motivo: 'indisponível: nenhuma proposta pendente',
          atual: false,
        },
    link('redacoes', 'Minhas redações', '/aluno/redacoes', caminho),
    link('feedbacks', 'Feedbacks', '/aluno/feedbacks', caminho),
    link('perfil', 'Perfil', '/aluno/perfil', caminho),
  ]
}

function itensDoProfessor({ caminho, propostasDisponiveis }) {
  return [
    link('painel', 'Painel', '/professor', caminho, true),
    link('turmas', 'Turmas', '/professor/turmas', caminho),
    link('notificacoes', 'Notificações', '/professor/notificacoes', caminho),
    // "Propostas" abre a escolha de turma e "Redações" leva à fila do painel:
    // são ações, não destinos (UX-008). Ficam como estavam até a D3.
    {
      chave: 'propostas',
      tipo: 'acao',
      acao: 'propostas',
      rotulo: 'Propostas',
      desabilitado: !propostasDisponiveis,
      atual: destinoAtivo(caminho, '/professor/temas'),
    },
    {
      chave: 'redacoes',
      tipo: 'acao',
      acao: 'redacoes',
      rotulo: 'Redações',
      desabilitado: false,
      atual: false,
    },
    link('perfil', 'Perfil', '/professor/perfil', caminho),
  ]
}

export function montarNavegacao({
  papel,
  caminho = '',
  rotaEnviarRedacao = null,
  propostasDisponiveis = false,
}) {
  return papel === 'PROFESSOR'
    ? itensDoProfessor({ caminho, propostasDisponiveis })
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
