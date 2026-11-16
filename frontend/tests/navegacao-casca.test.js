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

test('o aluno mantém os cinco itens e os mesmos destinos', () => {
  const itens = montarNavegacao({
    papel: 'ALUNO',
    caminho: '/aluno',
    rotaEnviarRedacao: '/aluno/temas/t1/redacao',
  })

  assert.deepEqual(rotulos(itens), [
    'Início',
    'Enviar redação',
    'Minhas redações',
    'Feedbacks',
    'Perfil',
  ])
  assert.deepEqual(
    itens.map((item) => item.para),
    [
      '/aluno',
      '/aluno/temas/t1/redacao',
      '/aluno/redacoes',
      '/aluno/feedbacks',
      '/aluno/perfil',
    ],
  )
  assert.ok(itens.every((item) => item.tipo === 'link'))
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

test('o professor mantém os seis itens: quatro destinos e duas ações', () => {
  const itens = montarNavegacao({ papel: 'PROFESSOR', caminho: '/professor' })

  assert.deepEqual(rotulos(itens), [
    'Painel',
    'Turmas',
    'Notificações',
    'Propostas',
    'Redações',
    'Perfil',
  ])
  assert.deepEqual(
    itens.filter((item) => item.tipo === 'link').map((item) => item.para),
    [
      '/professor',
      '/professor/turmas',
      '/professor/notificacoes',
      '/professor/perfil',
    ],
  )
  assert.deepEqual(
    itens.filter((item) => item.tipo === 'acao').map((item) => item.acao),
    ['propostas', 'redacoes'],
  )
})

test('"Propostas" só fica disponível quando a tela informa as turmas', () => {
  const propostas = (propostasDisponiveis) =>
    porChave(
      montarNavegacao({ papel: 'PROFESSOR', caminho: '/professor', propostasDisponiveis }),
      'propostas',
    )

  assert.equal(propostas(false).desabilitado, true)
  assert.equal(propostas(true).desabilitado, false)
})

test('cada rota do professor marca o mesmo item de antes', () => {
  const ativo = (caminho) => ativos(montarNavegacao({ papel: 'PROFESSOR', caminho }))

  assert.deepEqual(ativo('/professor'), ['painel'])
  assert.deepEqual(ativo('/professor/turmas'), ['turmas'])
  assert.deepEqual(ativo('/professor/turmas/abc'), ['turmas'])
  assert.deepEqual(ativo('/professor/turmas/abc/temas/novo'), ['turmas'])
  assert.deepEqual(ativo('/professor/temas/xyz'), ['propostas'])
  assert.deepEqual(ativo('/professor/notificacoes'), ['notificacoes'])
  assert.deepEqual(ativo('/professor/perfil'), ['perfil'])
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
  assert.deepEqual(ativo('/aluno/feedbacks'), ['feedbacks'])
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
