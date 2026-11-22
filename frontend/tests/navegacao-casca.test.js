import assert from 'node:assert/strict'
import test from 'node:test'

import {
  descreverAvisosNaoLidos,
  destinoAtivo,
  formatarContagemDoSino,
  montarNavegacao,
  normalizarTrilha,
  rotaInicialDoPapel,
} from '../src/utils/navegacao-casca.js'

// Navegação da casca única (AppShell). A casca mudou, os itens e os destinos de cada papel não:
// estes testes fixam o que cada papel via antes da unificação.
const rotulos = (itens) => itens.map((item) => item.rotulo)
const ativos = (itens) => itens.filter((item) => item.atual).map((item) => item.chave)
const porChave = (itens, chave) => itens.find((item) => item.chave === chave)

test('o aluno fica com quatro itens, todos links', () => {
  const itens = montarNavegacao({
    papel: 'ALUNO',
    caminho: '/aluno',
    rotaEnviarRedacao: '/aluno/temas/t1/redacao',
  })

  assert.deepEqual(rotulos(itens), [
    'Início',
    'Escrever redação',
    'Minhas redações',
    'Perfil',
  ])
  assert.deepEqual(
    itens.map((item) => item.para),
    [
      '/aluno',
      '/aluno/temas/t1/redacao',
      '/aluno/redacoes',
      '/aluno/perfil',
    ],
  )
  assert.ok(itens.every((item) => item.tipo === 'link'))
})

test('Feedbacks saiu do menu do aluno e não marca nenhum item', () => {
  const itens = montarNavegacao({ papel: 'ALUNO', caminho: '/aluno/feedbacks' })

  assert.equal(porChave(itens, 'feedbacks'), undefined)
  // O endereço antigo só redireciona; enquanto ele durar, nada fica marcado.
  assert.deepEqual(ativos(itens), [])
})

test('sem proposta pendente, "Enviar redação" fica indisponível e sem destino', () => {
  const item = porChave(
    montarNavegacao({ papel: 'ALUNO', caminho: '/aluno' }),
    'escrever',
  )

  assert.equal(item.tipo, 'indisponivel')
  assert.equal(item.para, undefined)
  assert.match(item.motivo, /nenhuma proposta pendente/)
})

test('o professor fica com três destinos e nenhuma ação', () => {
  const itens = montarNavegacao({ papel: 'PROFESSOR', caminho: '/professor' })

  assert.deepEqual(rotulos(itens), ['Painel', 'Turmas', 'Perfil'])
  assert.deepEqual(
    itens.map((item) => item.para),
    ['/professor', '/professor/turmas', '/professor/perfil'],
  )
  assert.ok(itens.every((item) => item.tipo === 'link'))
})

test('Redações, Propostas e Notificações saíram do menu do professor', () => {
  const itens = montarNavegacao({ papel: 'PROFESSOR', caminho: '/professor' })

  for (const chave of ['redacoes', 'propostas', 'notificacoes']) {
    assert.equal(porChave(itens, chave), undefined, chave)
  }
})

test('nenhum item do professor pode nascer desabilitado', () => {
  // O item "Propostas" dependia das turmas carregadas pela tela e ficava
  // morto em Notificações, Perfil e Nova proposta. Sem ações, não há item
  // que o menu possa apresentar sem destino.
  const caminhos = [
    '/professor',
    '/professor/notificacoes',
    '/professor/perfil',
    '/professor/temas/novo',
  ]

  for (const caminho of caminhos) {
    const itens = montarNavegacao({ papel: 'PROFESSOR', caminho })

    assert.ok(itens.every((item) => item.desabilitado === undefined), caminho)
    assert.ok(itens.every((item) => item.para), caminho)
  }
})

test('cada rota do professor marca o item por onde se chega a ela', () => {
  const ativo = (caminho) => ativos(montarNavegacao({ papel: 'PROFESSOR', caminho }))

  assert.deepEqual(ativo('/professor'), ['painel'])
  assert.deepEqual(ativo('/professor/turmas'), ['turmas'])
  assert.deepEqual(ativo('/professor/turmas/abc'), ['turmas'])
  assert.deepEqual(ativo('/professor/turmas/abc/temas/novo'), ['turmas'])
  // A proposta vive dentro de uma turma e é por Turmas que se chega a ela.
  assert.deepEqual(ativo('/professor/temas/xyz'), ['turmas'])
  assert.deepEqual(ativo('/professor/temas/novo'), ['turmas'])
  assert.deepEqual(ativo('/professor/perfil'), ['perfil'])
  // Notificações continua existindo como página, mas abre pelo sino: não é
  // destino do menu e por isso não marca item nenhum.
  assert.deepEqual(ativo('/professor/notificacoes'), [])
  // A correção é imersiva e não mostra o menu; nenhum item fica marcado.
  assert.deepEqual(ativo('/professor/redacoes/r1'), [])
})

test('cada rota do aluno marca o mesmo item de antes', () => {
  const ativo = (caminho, rotaEnviarRedacao = '/aluno/temas/t1/redacao') =>
    ativos(montarNavegacao({ papel: 'ALUNO', caminho, rotaEnviarRedacao }))

  assert.deepEqual(ativo('/aluno'), ['inicio'])
  assert.deepEqual(ativo('/aluno/temas/t1/redacao'), ['escrever'])
  assert.deepEqual(ativo('/aluno/temas/t1/redacao/ocr'), ['escrever'])
  // O editor de outra proposta não é o destino do atalho.
  assert.deepEqual(ativo('/aluno/temas/t2/redacao'), [])
  assert.deepEqual(ativo('/aluno/redacoes'), ['redacoes'])
  assert.deepEqual(ativo('/aluno/redacoes/r1/feedback'), ['redacoes'])
  assert.deepEqual(ativo('/aluno/notificacoes'), [])
  assert.deepEqual(ativo('/aluno/perfil'), ['perfil'])
})

test('destinoAtivo ignora barra final e não confunde prefixos parecidos', () => {
  assert.equal(destinoAtivo('/aluno/', '/aluno', true), true)
  assert.equal(destinoAtivo('/aluno/redacoes', '/aluno', true), false)
  assert.equal(destinoAtivo('/professor/turmas-antigas', '/professor/turmas'), false)
  assert.equal(destinoAtivo('/professor/turmas/1', '/professor/turmas'), true)
  assert.equal(destinoAtivo('/aluno', null), false)
})

test('a rota inicial segue o papel', () => {
  assert.equal(rotaInicialDoPapel('PROFESSOR'), '/professor')
  assert.equal(rotaInicialDoPapel('ALUNO'), '/aluno')
})

test('o rótulo do sino é o mesmo nos dois papéis para a mesma contagem', () => {
  assert.equal(descreverAvisosNaoLidos(0), 'Notificações: nenhum aviso não lido')
  assert.equal(descreverAvisosNaoLidos(1), 'Notificações: 1 aviso não lido')
  assert.equal(descreverAvisosNaoLidos(7), 'Notificações: 7 avisos não lidos')
  // Contagem ausente ou inválida não vira "undefined avisos".
  assert.equal(descreverAvisosNaoLidos(undefined), 'Notificações: nenhum aviso não lido')
  assert.equal(descreverAvisosNaoLidos(-2), 'Notificações: nenhum aviso não lido')
})

test('a contagem do sino para em 99+', () => {
  assert.equal(formatarContagemDoSino(3), '3')
  assert.equal(formatarContagemDoSino(99), '99')
  assert.equal(formatarContagemDoSino(100), '99+')
})

test('a trilha aceita texto e links, e o último item é a página atual', () => {
  const trilha = normalizarTrilha([
    { rotulo: 'Turmas', para: '/professor/turmas' },
    { rotulo: '3º A', para: '/professor/turmas/abc' },
    'Proposta',
  ])

  assert.deepEqual(trilha, [
    { rotulo: 'Turmas', para: '/professor/turmas', atual: false },
    { rotulo: '3º A', para: '/professor/turmas/abc', atual: false },
    { rotulo: 'Proposta', para: null, atual: true },
  ])
})

test('a página atual nunca é link, e itens vazios somem da trilha', () => {
  assert.deepEqual(normalizarTrilha(['Enviar redação', '', undefined]), [
    { rotulo: 'Enviar redação', para: null, atual: true },
  ])
  assert.deepEqual(
    normalizarTrilha([{ rotulo: 'Turmas', para: '/professor/turmas' }]),
    [{ rotulo: 'Turmas', para: null, atual: true }],
  )
  assert.deepEqual(normalizarTrilha(undefined), [])
})
