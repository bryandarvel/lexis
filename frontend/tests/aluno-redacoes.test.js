import test from 'node:test'
import assert from 'node:assert/strict'
import {
  descreverDestino,
  descreverResultado,
  descreverSituacao,
  filtrarRedacoes,
  formatarDataRedacao,
  ordenarRedacoes,
  resumirRedacoes,
} from '../src/utils/aluno-redacoes.js'

const TURMA = 'turma-atual'
const AGORA = new Date('2026-11-01T12:00:00.000Z')
const tema = (extra = {}) => ({
  id: 't1', ativo: true, prazoEntrega: '2026-12-01T12:00:00.000Z',
  turma: { id: TURMA }, ...extra,
})
const redacao = (extra = {}) => ({
  id: 'r1', temaId: 't1', status: 'RASCUNHO', tema: tema(),
  enviadaEm: null, atualizadoEm: '2026-10-20T10:00:00.000Z',
  notaPublicada: null, publicadoEm: null, ...extra,
})

test('rótulos de situação seguem os três status do backend', () => {
  assert.deepEqual(descreverSituacao(redacao()), { rotulo: 'Rascunho', tom: 'neutro' })
  assert.deepEqual(descreverSituacao(redacao({ status: 'ENVIADA' })), { rotulo: 'Aguardando correção', tom: 'atencao' })
  assert.deepEqual(descreverSituacao(redacao({ status: 'AVALIADA', notaPublicada: 800 })), { rotulo: 'Corrigida', tom: 'sucesso' })
  assert.equal(descreverSituacao(redacao({ status: 'XPTO' })).rotulo, 'Situação indisponível')
  assert.equal(descreverSituacao(null).rotulo, 'Situação indisponível')
})

test('avaliada sem nota publicada não finge ter nota', () => {
  const s = descreverSituacao(redacao({ status: 'AVALIADA', notaPublicada: null }))
  assert.equal(s.rotulo, 'Corrigida, nota indisponível')
  assert.equal(s.tom, 'atencao')
})

test('feedback abre só com nota publicada', () => {
  const com = descreverDestino(redacao({ id: 'a b', status: 'AVALIADA', notaPublicada: 720 }), { turmaAtualId: TURMA })
  assert.equal(com.tipo, 'feedback')
  assert.equal(com.para, '/aluno/redacoes/a%20b/feedback')
  const sem = descreverDestino(redacao({ status: 'AVALIADA', notaPublicada: null }), { turmaAtualId: TURMA })
  assert.equal(sem.tipo, 'nenhum')
})

test('rascunho da turma atual, ativo e no prazo abre o editor', () => {
  const d = descreverDestino(redacao(), { turmaAtualId: TURMA, agora: AGORA })
  assert.equal(d.tipo, 'editor')
  assert.equal(d.para, '/aluno/temas/t1/redacao')
})

test('rascunho de turma que o aluno deixou não abre o editor e explica', () => {
  const d = descreverDestino(redacao({ tema: tema({ turma: { id: 'outra' } }) }), { turmaAtualId: TURMA, agora: AGORA })
  assert.equal(d.tipo, 'nenhum')
  assert.match(d.motivo, /saiu desta turma/)
  // Sem matrícula atual, nenhum rascunho é editável.
  assert.equal(descreverDestino(redacao(), { turmaAtualId: null, agora: AGORA }).tipo, 'nenhum')
})

test('rascunho de proposta arquivada não abre o editor', () => {
  const arquivada = descreverDestino(redacao({ tema: tema({ ativo: false }) }), { turmaAtualId: TURMA, agora: AGORA })
  assert.equal(arquivada.tipo, 'nenhum')
  assert.match(arquivada.motivo, /arquivada/)
})

// O backend aceita a entrega com atraso, e o painel oferece a mesma proposta:
// o prazo vencido avisa, não bloqueia.
test('rascunho da turma atual com prazo vencido continua editável, com aviso', () => {
  const vencida = descreverDestino(
    redacao({ tema: tema({ prazoEntrega: '2026-10-01T12:00:00.000Z' }) }),
    { turmaAtualId: TURMA, agora: AGORA },
  )

  assert.equal(vencida.tipo, 'editor')
  assert.equal(vencida.para, '/aluno/temas/t1/redacao')
  assert.equal(vencida.rotulo, 'Continuar escrevendo')
  assert.match(vencida.aviso, /atraso/)
  assert.equal(vencida.motivo, undefined)
})

test('dentro do prazo o editor abre sem aviso de atraso', () => {
  const noPrazo = descreverDestino(redacao(), { turmaAtualId: TURMA, agora: AGORA })

  assert.equal(noPrazo.tipo, 'editor')
  assert.equal(noPrazo.aviso, undefined)
})

test('prazo vencido não libera turma antiga, proposta arquivada nem enviada', () => {
  const vencido = { prazoEntrega: '2026-10-01T12:00:00.000Z' }

  assert.equal(
    descreverDestino(redacao({ tema: tema(vencido) }), { turmaAtualId: 'outra-turma', agora: AGORA }).tipo,
    'nenhum',
  )
  assert.equal(
    descreverDestino(redacao({ tema: tema({ ...vencido, ativo: false }) }), { turmaAtualId: TURMA, agora: AGORA }).tipo,
    'nenhum',
  )
  assert.equal(
    descreverDestino(redacao({ status: 'ENVIADA', tema: tema(vencido) }), { turmaAtualId: TURMA, agora: AGORA }).tipo,
    'nenhum',
  )
})

test('redação enviada explica que aguarda a correção', () => {
  const d = descreverDestino(redacao({ status: 'ENVIADA' }), { turmaAtualId: TURMA })
  assert.equal(d.tipo, 'nenhum')
  assert.match(d.motivo, /corrigir/)
  assert.equal(descreverDestino({}, {}).tipo, 'nenhum')
})

test('filtra por situação e devolve tudo em "todas"', () => {
  const lista = [redacao({ id: '1' }), redacao({ id: '2', status: 'ENVIADA' }), redacao({ id: '3', status: 'AVALIADA' })]
  assert.equal(filtrarRedacoes(lista).length, 3)
  assert.deepEqual(filtrarRedacoes(lista, 'ENVIADA').map((r) => r.id), ['2'])
  assert.deepEqual(filtrarRedacoes(lista, 'AVALIADA').map((r) => r.id), ['3'])
  assert.deepEqual(filtrarRedacoes(null, 'RASCUNHO'), [])
})

test('ordena por data, da mais recente para a mais antiga e o inverso', () => {
  const lista = [
    redacao({ id: 'a', enviadaEm: '2026-10-10T10:00:00.000Z', status: 'ENVIADA' }),
    redacao({ id: 'b', enviadaEm: '2026-10-25T10:00:00.000Z', status: 'ENVIADA' }),
    redacao({ id: 'c', atualizadoEm: '2026-10-15T10:00:00.000Z' }),
  ]
  assert.deepEqual(ordenarRedacoes(lista, 'recentes').map((r) => r.id), ['b', 'c', 'a'])
  assert.deepEqual(ordenarRedacoes(lista, 'antigas').map((r) => r.id), ['a', 'c', 'b'])
  assert.deepEqual(lista.map((r) => r.id), ['a', 'b', 'c'])
})

test('ordena por nota e manda as sem nota para o fim nas duas direções', () => {
  const lista = [
    redacao({ id: 'x', status: 'AVALIADA', notaPublicada: 600, enviadaEm: '2026-10-01T00:00:00.000Z' }),
    redacao({ id: 'y', status: 'ENVIADA', enviadaEm: '2026-10-20T00:00:00.000Z' }),
    redacao({ id: 'z', status: 'AVALIADA', notaPublicada: 900, enviadaEm: '2026-10-02T00:00:00.000Z' }),
  ]
  assert.deepEqual(ordenarRedacoes(lista, 'maior-nota').map((r) => r.id), ['z', 'x', 'y'])
  assert.deepEqual(ordenarRedacoes(lista, 'menor-nota').map((r) => r.id), ['x', 'z', 'y'])
})

test('resume as redações por situação', () => {
  const lista = [redacao(), redacao({ status: 'ENVIADA' }), redacao({ status: 'ENVIADA' }), redacao({ status: 'AVALIADA' })]
  assert.deepEqual(resumirRedacoes(lista), { total: 4, rascunhos: 1, aguardando: 2, corrigidas: 1 })
  assert.deepEqual(resumirRedacoes(undefined), { total: 0, rascunhos: 0, aguardando: 0, corrigidas: 0 })
})

test('texto da contagem concorda em número e mostra o total filtrado', () => {
  assert.equal(descreverResultado(0, 0, 'todas'), 'Nenhuma redação.')
  assert.equal(descreverResultado(1, 1, 'todas'), '1 redação.')
  assert.equal(descreverResultado(3, 3, 'todas'), '3 redações.')
  assert.equal(descreverResultado(2, 7, 'ENVIADA'), '2 redações de 7.')
  assert.equal(descreverResultado(0, 5, 'AVALIADA'), '0 redações de 5.')
})

test('data distingue enviada de salva e tolera valor ausente', () => {
  assert.match(formatarDataRedacao(redacao({ enviadaEm: '2026-10-10T12:00:00.000Z', status: 'ENVIADA' })), /^Enviada em /)
  assert.match(formatarDataRedacao(redacao()), /^Salva em /)
  assert.equal(formatarDataRedacao({}), null)
})
