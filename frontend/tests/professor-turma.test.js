import test from 'node:test'
import assert from 'node:assert/strict'
import {
  descreverResultadoDasPropostas,
  descreverSituacaoAluno,
  descreverSituacaoTurma,
  obterStatusTema,
  ordenarAlunosDaTurma,
  descreverResultadoDosAlunos,
  filtrarAlunosDaTurma,
  ondeABuscaEncontrou,
  organizarPropostasDaTurma,
  resumirAlunosDaTurma,
} from '../src/utils/professor-turma.js'
import { prepararNomeTurma } from '../src/utils/professor-classes.js'

test('situação da turma libera a gestão apenas com turma ativa', () => {
  assert.deepEqual(descreverSituacaoTurma({ ativa: true }), {
    ativa: true, rotulo: 'Ativa', podeGerenciar: true,
  })
  assert.deepEqual(descreverSituacaoTurma({ ativa: false }), {
    ativa: false, rotulo: 'Arquivada', podeGerenciar: false,
  })
  // Sem o campo, trata como ativa para não bloquear a tela por dado ausente.
  assert.equal(descreverSituacaoTurma({}).ativa, true)
  assert.equal(descreverSituacaoTurma(null).ativa, true)
})

test('situação do aluno distingue conta desativada de matrícula encerrada', () => {
  assert.deepEqual(descreverSituacaoAluno({ status: 'ATIVA', aluno: { ativo: true } }), {
    rotulo: 'Matrícula ativa', atencao: false,
  })
  assert.deepEqual(descreverSituacaoAluno({ status: 'ENCERRADA', aluno: { ativo: true } }), {
    rotulo: 'Matrícula encerrada', atencao: true,
  })
  // A conta desativada tem precedência: explica melhor por que o aluno sumiu.
  assert.deepEqual(descreverSituacaoAluno({ status: 'ATIVA', aluno: { ativo: false } }), {
    rotulo: 'Conta desativada', atencao: true,
  })
  assert.equal(descreverSituacaoAluno(undefined).rotulo, 'Matrícula ativa')
})

test('ordena alunos por nome em pt-BR, sem alterar a lista recebida', () => {
  const matriculas = [
    { id: '3', aluno: { nome: 'Édson Alves', email: 'c@x.test' } },
    { id: '1', aluno: { nome: 'ana lima', email: 'a@x.test' } },
    { id: '2', aluno: { nome: 'Ana Lima', email: 'b@x.test' } },
  ]
  const ordenadas = ordenarAlunosDaTurma(matriculas)

  assert.deepEqual(ordenadas.map((item) => item.id), ['1', '2', '3'])
  assert.deepEqual(matriculas.map((item) => item.id), ['3', '1', '2'])
  assert.deepEqual(ordenarAlunosDaTurma(null), [])
  assert.deepEqual(ordenarAlunosDaTurma([{ id: 'x' }]).map((i) => i.id), ['x'])
})

test('resumo da lista conta alunos e contas desativadas', () => {
  assert.deepEqual(resumirAlunosDaTurma([
    { aluno: { ativo: true } }, { aluno: { ativo: false } },
  ]), { total: 2, desativados: 1, rotulo: '2 alunos ativos' })
  assert.deepEqual(resumirAlunosDaTurma([{ aluno: { ativo: true } }]), {
    total: 1, desativados: 0, rotulo: '1 aluno ativo',
  })
  assert.deepEqual(resumirAlunosDaTurma([]), {
    total: 0, desativados: 0, rotulo: '0 alunos ativos',
  })
  assert.equal(resumirAlunosDaTurma(undefined).total, 0)
})

test('renomear usa a mesma validação de nome da criação', () => {
  assert.deepEqual(prepararNomeTurma('  3º B   — Manhã  '), { nome: '3º B — Manhã' })
  assert.ok(prepararNomeTurma('A').erro)
  assert.ok(prepararNomeTurma('A'.repeat(101)).erro)
})

/*
 * Propostas da turma (Issue #175). O "agora" é sempre explícito para o teste
 * não depender do relógio da máquina.
 */
const AGORA = new Date('2026-11-19T12:00:00Z').getTime()
const DIA = 86400000
const proposta = (id, enunciado, dias, ativo = true) => ({
  id,
  enunciado,
  ativo,
  prazoEntrega: new Date(AGORA + dias * DIA).toISOString(),
})

const enunciados = (lista) => lista.map((item) => item.enunciado)

test('o status da proposta separa arquivada, prazo encerrado e recebendo', () => {
  assert.equal(obterStatusTema(proposta('a', 'A', 2), AGORA), 'Recebendo redações')
  assert.equal(obterStatusTema(proposta('b', 'B', -2), AGORA), 'Prazo encerrado')
  assert.equal(obterStatusTema(proposta('c', 'C', 2, false), AGORA), 'Arquivado')
  // Arquivada tem precedência sobre o prazo ainda aberto.
  assert.equal(obterStatusTema(proposta('d', 'D', 9, false), AGORA), 'Arquivado')
  // Prazo ausente ou inválido não vira "encerrado" por acidente.
  assert.equal(obterStatusTema({ ativo: true, prazoEntrega: null }, AGORA), 'Recebendo redações')
  assert.equal(obterStatusTema({ ativo: true, prazoEntrega: 'ontem' }, AGORA), 'Recebendo redações')
})

test('a proposta que ainda recebe vem antes da encerrada e da arquivada', () => {
  const lista = [
    proposta('1', 'Arquivada', 5, false),
    proposta('2', 'Encerrada antiga', -10),
    proposta('3', 'Aberta', 3),
    proposta('4', 'Encerrada recente', -1),
  ]

  assert.deepEqual(
    enunciados(organizarPropostasDaTurma(lista, { agora: AGORA })),
    ['Aberta', 'Encerrada recente', 'Encerrada antiga', 'Arquivada'],
  )
})

test('dentro do grupo, a mais recente primeiro, e o empate preserva a ordem recebida', () => {
  const lista = [
    proposta('1', 'Primeira do empate', 4),
    proposta('2', 'Mais distante', 9),
    proposta('3', 'Segunda do empate', 4),
  ]

  assert.deepEqual(
    enunciados(organizarPropostasDaTurma(lista, { agora: AGORA })),
    ['Mais distante', 'Primeira do empate', 'Segunda do empate'],
  )
})

test('prazo ausente não some da lista: cai no fim do próprio grupo', () => {
  const lista = [
    { id: '1', enunciado: 'Sem prazo', ativo: true, prazoEntrega: null },
    proposta('2', 'Com prazo', 2),
  ]

  assert.deepEqual(
    enunciados(organizarPropostasDaTurma(lista, { agora: AGORA })),
    ['Com prazo', 'Sem prazo'],
  )
})

test('o filtro separa ativas e arquivadas, e "todas" não esconde nada', () => {
  const lista = [proposta('1', 'Aberta', 2), proposta('2', 'Guardada', 2, false)]
  const comFiltro = (filtro) =>
    enunciados(organizarPropostasDaTurma(lista, { filtro, agora: AGORA }))

  assert.deepEqual(comFiltro('ativas'), ['Aberta'])
  assert.deepEqual(comFiltro('arquivadas'), ['Guardada'])
  assert.deepEqual(comFiltro('todas'), ['Aberta', 'Guardada'])
  // Filtro desconhecido não pode esvaziar a tela.
  assert.deepEqual(comFiltro('qualquer'), ['Aberta', 'Guardada'])
})

test('a busca pelo enunciado ignora acento e caixa', () => {
  const lista = [
    proposta('1', 'Inclusão digital no Brasil', 2),
    proposta('2', 'Mobilidade urbana', 2),
  ]
  const buscar = (busca) =>
    enunciados(organizarPropostasDaTurma(lista, { busca, agora: AGORA }))

  assert.deepEqual(buscar('INCLUSAO'), ['Inclusão digital no Brasil'])
  assert.deepEqual(buscar('urbana'), ['Mobilidade urbana'])
  assert.deepEqual(buscar('  '), ['Inclusão digital no Brasil', 'Mobilidade urbana'])
  assert.deepEqual(buscar('repertório'), [])
})

test('busca e filtro se somam', () => {
  const lista = [
    proposta('1', 'Inclusão digital', 2),
    proposta('2', 'Inclusão social', 2, false),
  ]

  assert.deepEqual(
    enunciados(organizarPropostasDaTurma(lista, { busca: 'inclusao', filtro: 'ativas', agora: AGORA })),
    ['Inclusão digital'],
  )
})

test('lista ausente não quebra a organização', () => {
  assert.deepEqual(organizarPropostasDaTurma(undefined), [])
  assert.deepEqual(organizarPropostasDaTurma(null, { busca: 'x' }), [])
})

test('a contagem do resultado só aparece quando a busca esconde alguma proposta', () => {
  assert.equal(descreverResultadoDasPropostas(4, 4), '')
  assert.equal(descreverResultadoDasPropostas(2, 4), '2 propostas de 4.')
  assert.equal(descreverResultadoDasPropostas(1, 4), '1 proposta de 4.')
})

/*
 * Issue #194. A grade de cartoes substituiu a lista de alunos, e com 15 ou
 * mais cartoes achar alguem pelo olho deixa de ser viavel.
 */
const matricula = (nome, email) => ({ id: email, aluno: { nome, email } })

const TURMA_CHEIA = [
  matricula('Bento do Farol', 'aluno.t04.a15@lexis.example.com'),
  matricula('Iara do Ipê', 'iara@escola.example.com'),
  matricula('Caio do Farol', 'aluno.t04.a04@lexis.example.com'),
]

test('Issue #194: a busca de alunos olha nome e e-mail, ignorando acento e caixa', () => {
  assert.deepEqual(filtrarAlunosDaTurma(TURMA_CHEIA, 'IPE').map((item) => item.aluno.nome), ['Iara do Ipê'])
  assert.deepEqual(filtrarAlunosDaTurma(TURMA_CHEIA, 'farol').length, 2)
  // O e-mail identifica quando os nomes se repetem.
  assert.deepEqual(filtrarAlunosDaTurma(TURMA_CHEIA, 'a04').map((item) => item.aluno.nome), ['Caio do Farol'])
  assert.deepEqual(filtrarAlunosDaTurma(TURMA_CHEIA, 'ninguem'), [])
})

test('Issue #194: busca vazia devolve a lista inteira, e lista ausente nao quebra', () => {
  assert.equal(filtrarAlunosDaTurma(TURMA_CHEIA, ''), TURMA_CHEIA)
  assert.equal(filtrarAlunosDaTurma(TURMA_CHEIA, '   '), TURMA_CHEIA)
  assert.deepEqual(filtrarAlunosDaTurma(undefined, 'a'), [])
  assert.deepEqual(filtrarAlunosDaTurma([{ id: 'x' }], 'a'), [])
})

test('Issue #194: a contagem de alunos so aparece quando a busca esconde alguem', () => {
  assert.equal(descreverResultadoDosAlunos(3, 3), '')
  assert.equal(descreverResultadoDosAlunos(2, 3), '2 alunos de 3.')
  assert.equal(descreverResultadoDosAlunos(1, 3), '1 aluno de 3.')
})

/*
 * Issue #194. O cartao parou de mostrar a descricao, mas a busca passou a
 * olhar dentro dela: sem a pista, a proposta apareceria sem o termo a vista.
 */
const PROPOSTA = {
  id: 'p1',
  ativo: true,
  enunciado: 'Mobilidade urbana',
  descricao: 'Analise o impacto das ciclovias na periferia.',
  instrucoes: 'Texto I — Relatório fictício sobre calçadas.',
}

test('Issue #194: a busca das propostas alcanca descricao e orientacoes', () => {
  const temas = [PROPOSTA, { id: 'p2', ativo: true, enunciado: 'Outra coisa', descricao: 'Nada aqui.' }]

  assert.deepEqual(organizarPropostasDaTurma(temas, { busca: 'ciclovias' }).map((t) => t.id), ['p1'])
  assert.deepEqual(organizarPropostasDaTurma(temas, { busca: 'calçadas' }).map((t) => t.id), ['p1'])
  assert.deepEqual(organizarPropostasDaTurma(temas, { busca: 'MOBILIDADE' }).map((t) => t.id), ['p1'])
  assert.deepEqual(organizarPropostasDaTurma(temas, { busca: '' }).map((t) => t.id).sort(), ['p1', 'p2'])
})

test('Issue #194: a pista diz onde a busca encontrou, e cala quando foi no enunciado', () => {
  assert.equal(ondeABuscaEncontrou(PROPOSTA, 'mobilidade'), '')
  assert.equal(ondeABuscaEncontrou(PROPOSTA, ''), '')
  assert.equal(ondeABuscaEncontrou(PROPOSTA, 'ciclovias'), 'Encontrada na descrição da proposta.')
  assert.equal(ondeABuscaEncontrou(PROPOSTA, 'calçadas'), 'Encontrada nas orientações da proposta.')
  assert.equal(ondeABuscaEncontrou(PROPOSTA, 'inexistente'), '')
  assert.equal(ondeABuscaEncontrou(undefined, 'x'), '')
})
