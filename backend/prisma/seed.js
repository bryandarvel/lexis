import bcrypt from 'bcrypt'

import { env } from '../src/config/env.js'
import { prisma } from '../src/config/prisma.js'
import {
  obterModeloCompetenciaDois,
} from '../src/modules/temas/temas.competencia-dois.js'

const SENHA_DEMONSTRACAO = 'LexisDemo2026!'

const ids = {
  professor: '10000000-0000-4000-8000-000000000001',
  alunos: Array.from(
    { length: 5 },
    (_, indice) =>
      `10000000-0000-4000-8000-${String(
        indice + 11,
      ).padStart(12, '0')}`,
  ),
  turma: '20000000-0000-4000-8000-000000000001',
  tema: '30000000-0000-4000-8000-000000000001',
  criterios: Array.from(
    { length: 3 },
    (_, indice) =>
      `31000000-0000-4000-8000-${String(
        indice + 1,
      ).padStart(12, '0')}`,
  ),
  redacoes: Array.from(
    { length: 5 },
    (_, indice) =>
      `40000000-0000-4000-8000-${String(
        indice + 1,
      ).padStart(12, '0')}`,
  ),
  analises: [
    '50000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
  ],
  feedbacks: [
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000002',
  ],
  feedbackVersoes: [
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
  ],
  notificacao:
    '70000000-0000-4000-8000-000000000001',
}

const textos = {
  rascunho:
    'A inclusão digital precisa ser compreendida como um direito social. Este rascunho ainda está em desenvolvimento.',
  enviada:
    'A Constituição Federal de 1988 assegura a educação como direito de todos. Entretanto, a desigualdade de acesso à internet limita a participação de muitos estudantes. Assim, políticas públicas de conectividade são essenciais para democratizar oportunidades.',
  ocr: 'A exclusão digital amplia desigualdades educacionais. Segundo a pesquisa TIC Domicílios, parte da população ainda enfrenta conexão precária. Portanto, ampliar infraestrutura e formação digital é indispensável.',
  avaliada:
    'Paulo Freire defende uma educação capaz de promover autonomia. No cenário digital, essa ideia exige acesso à internet e formação crítica para que a tecnologia contribua com a aprendizagem. Logo, Estado e escolas devem atuar de forma conjunta.',
  correcaoPendente:
    'A tecnologia faz parte da educação contemporânea, mas seu acesso permanece desigual. Investimentos públicos podem reduzir essa distância e favorecer a aprendizagem.',
}

function criarEvidencia(texto, trecho) {
  const inicio = texto.indexOf(trecho)

  return {
    trecho,
    inicio,
    fim: inicio + trecho.length,
    statusLocalizacao: 'LOCALIZADA',
    metodoLocalizacao: 'POSICAO_INFORMADA',
  }
}

async function upsertUsuario({
  id,
  nome,
  email,
  papel,
  senhaHash,
}) {
  return prisma.usuario.upsert({
    where: { email },
    update: {
      nome,
      senhaHash,
      papel,
      ativo: true,
      desativadoEm: null,
    },
    create: {
      id,
      nome,
      email,
      senhaHash,
      papel,
    },
  })
}

async function garantirMatricula(alunoId, turmaId) {
  const existente = await prisma.matricula.findFirst({
    where: { alunoId, turmaId },
    orderBy: { iniciadaEm: 'asc' },
  })

  if (existente) {
    return prisma.matricula.update({
      where: { id: existente.id },
      data: {
        status: 'ATIVA',
        encerradaEm: null,
      },
    })
  }

  return prisma.matricula.create({
    data: {
      alunoId,
      turmaId,
      status: 'ATIVA',
    },
  })
}

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'O seed de demonstração não pode ser executado em produção.',
    )
  }

  const senhaHash = await bcrypt.hash(
    SENHA_DEMONSTRACAO,
    env.BCRYPT_ROUNDS,
  )
  const professor = await upsertUsuario({
    id: ids.professor,
    nome: 'Professora Helena Demo',
    email: 'professor.demo@lexis.example.com',
    papel: 'PROFESSOR',
    senhaHash,
  })
  const alunos = []

  for (let indice = 0; indice < 5; indice += 1) {
    alunos.push(
      await upsertUsuario({
        id: ids.alunos[indice],
        nome: [
          'Ana Lima',
          'Bruno Santos',
          'Carla Oliveira',
          'Diego Souza',
          'Eduarda Costa',
        ][indice],
        email: `aluno${indice + 1}.demo@lexis.example.com`,
        papel: 'ALUNO',
        senhaHash,
      }),
    )
  }

  const turma = await prisma.turma.upsert({
    where: { codigoAcesso: 'LEX-DEMO' },
    update: {
      nome: '3º A — Demonstração LÉXIS',
      professorId: professor.id,
      ativa: true,
      arquivadaEm: null,
    },
    create: {
      id: ids.turma,
      nome: '3º A — Demonstração LÉXIS',
      codigoAcesso: 'LEX-DEMO',
      professorId: professor.id,
    },
  })

  for (const aluno of alunos) {
    await garantirMatricula(aluno.id, turma.id)
  }

  const tema = await prisma.temaRedacao.upsert({
    where: { id: ids.tema },
    update: {
      turmaId: turma.id,
      enunciado:
        'Desafios para a democratização do acesso à tecnologia na educação brasileira',
      descricao:
        'Produza um texto dissertativo-argumentativo sobre os obstáculos e caminhos para ampliar o acesso significativo à tecnologia na educação brasileira.',
      instrucoes:
        'Mobilize repertório sociocultural e apresente uma proposta de intervenção que respeite os direitos humanos.',
      prazoEntrega: new Date(
        '2026-10-10T23:59:00-03:00',
      ),
      ativo: true,
      arquivadoEm: null,
      criteriosBloqueadosEm: new Date(
        '2026-09-01T09:00:00-03:00',
      ),
    },
    create: {
      id: ids.tema,
      turmaId: turma.id,
      enunciado:
        'Desafios para a democratização do acesso à tecnologia na educação brasileira',
      descricao:
        'Produza um texto dissertativo-argumentativo sobre os obstáculos e caminhos para ampliar o acesso significativo à tecnologia na educação brasileira.',
      instrucoes:
        'Mobilize repertório sociocultural e apresente uma proposta de intervenção que respeite os direitos humanos.',
      prazoEntrega: new Date(
        '2026-10-10T23:59:00-03:00',
      ),
      criteriosBloqueadosEm: new Date(
        '2026-09-01T09:00:00-03:00',
      ),
    },
  })

  const modelo = obterModeloCompetenciaDois()
  const criterios = []

  for (let indice = 0; indice < modelo.criterios.length; indice += 1) {
    const dados = modelo.criterios[indice]
    criterios.push(
      await prisma.criterioAvaliacao.upsert({
        where: { id: ids.criterios[indice] },
        update: {
          temaId: tema.id,
          nome: dados.nome,
          descricao: dados.descricao,
          ordem: indice + 1,
        },
        create: {
          id: ids.criterios[indice],
          temaId: tema.id,
          nome: dados.nome,
          descricao: dados.descricao,
          ordem: indice + 1,
        },
      }),
    )
  }

  const agoraEnvio = new Date(
    '2026-09-01T09:00:00-03:00',
  )
  const configuracoesRedacao = [
    {
      texto: textos.rascunho,
      status: 'RASCUNHO',
      origemTexto: 'DIGITADO',
    },
    {
      texto: textos.enviada,
      status: 'ENVIADA',
      origemTexto: 'DIGITADO',
      enviadaEm: agoraEnvio,
    },
    {
      texto: textos.ocr,
      status: 'ENVIADA',
      origemTexto: 'OCR',
      ocrRevisadoEm: agoraEnvio,
      enviadaEm: agoraEnvio,
    },
    {
      texto: textos.avaliada,
      status: 'AVALIADA',
      origemTexto: 'DIGITADO',
      enviadaEm: agoraEnvio,
    },
    {
      texto: textos.correcaoPendente,
      status: 'ENVIADA',
      origemTexto: 'DIGITADO',
      enviadaEm: agoraEnvio,
    },
  ]
  const redacoes = []

  for (let indice = 0; indice < configuracoesRedacao.length; indice += 1) {
    const dados = configuracoesRedacao[indice]
    const enviada = Boolean(dados.enviadaEm)

    redacoes.push(
      await prisma.redacao.upsert({
        where: {
          alunoId_temaId: {
            alunoId: alunos[indice].id,
            temaId: tema.id,
          },
        },
        update: {
          ...dados,
          prazoConsideradoEm: enviada
            ? tema.prazoEntrega
            : null,
          enviadaComAtraso: enviada ? false : null,
        },
        create: {
          id: ids.redacoes[indice],
          alunoId: alunos[indice].id,
          temaId: tema.id,
          ...dados,
          prazoConsideradoEm: enviada
            ? tema.prazoEntrega
            : null,
          enviadaComAtraso: enviada ? false : null,
        },
      }),
    )
  }

  const criteriosSnapshot = criterios.map(
    ({ id, nome, descricao, ordem }) => ({
      id,
      nome,
      descricao,
      ordem,
    }),
  )
  const trecho =
    'A Constituição Federal de 1988 assegura a educação como direito de todos.'

  await prisma.analiseIA.upsert({
    where: { id: ids.analises[0] },
    update: {
      redacaoId: redacoes[1].id,
      solicitadaPorId: professor.id,
      status: 'CONCLUIDA',
      modelo: 'fixture-demonstracao',
      versaoPrompt:
        'analise-redacao-v3-evidencias-posicionais',
      criteriosSnapshot,
      resultadoEstruturado: {
        resumoGeral:
          'A redação apresenta repertório legitimado e relacionado ao tema, com espaço para aprofundar a articulação argumentativa.',
        pontosFortes: [
          'A referência constitucional é verificável.',
        ],
        pontosDeAtencao: [
          'A relação entre repertório e proposta pode ser aprofundada.',
        ],
        analisePorCriterio: criterios.map((criterio) => ({
          ordem: criterio.ordem,
          criterio: criterio.nome,
          diagnostico:
            'Diagnóstico técnico de demonstração, previamente identificado como fixture e sujeito à revisão humana.',
          evidencias:
            criterio.ordem === 1
              ? [criarEvidencia(textos.enviada, trecho)]
              : [],
          orientacaoAoProfessor:
            'Revise a evidência e decida se ela sustenta o critério.',
        })),
        observacoesFinais:
          'Resultado sintético de fixture; não foi gerado por execução externa.',
      },
      duracaoMs: 0,
      mensagemErro: null,
      iniciadaEm: agoraEnvio,
      concluidaEm: agoraEnvio,
    },
    create: {
      id: ids.analises[0],
      redacaoId: redacoes[1].id,
      solicitadaPorId: professor.id,
      status: 'CONCLUIDA',
      modelo: 'fixture-demonstracao',
      versaoPrompt:
        'analise-redacao-v3-evidencias-posicionais',
      criteriosSnapshot,
      resultadoEstruturado: {
        resumoGeral:
          'A redação apresenta repertório legitimado e relacionado ao tema, com espaço para aprofundar a articulação argumentativa.',
        pontosFortes: [
          'A referência constitucional é verificável.',
        ],
        pontosDeAtencao: [
          'A relação entre repertório e proposta pode ser aprofundada.',
        ],
        analisePorCriterio: criterios.map((criterio) => ({
          ordem: criterio.ordem,
          criterio: criterio.nome,
          diagnostico:
            'Diagnóstico técnico de demonstração, previamente identificado como fixture e sujeito à revisão humana.',
          evidencias:
            criterio.ordem === 1
              ? [criarEvidencia(textos.enviada, trecho)]
              : [],
          orientacaoAoProfessor:
            'Revise a evidência e decida se ela sustenta o critério.',
        })),
        observacoesFinais:
          'Resultado sintético de fixture; não foi gerado por execução externa.',
      },
      duracaoMs: 0,
      iniciadaEm: agoraEnvio,
      concluidaEm: agoraEnvio,
    },
  })

  await prisma.analiseIA.upsert({
    where: { id: ids.analises[1] },
    update: {
      redacaoId: redacoes[2].id,
      solicitadaPorId: professor.id,
      status: 'ERRO',
      modelo: 'fixture-demonstracao',
      versaoPrompt:
        'analise-redacao-v3-evidencias-posicionais',
      criteriosSnapshot,
      resultadoEstruturado: null,
      duracaoMs: 8000,
      mensagemErro:
        'FIXTURE_EXTERNAL_SERVICE_UNAVAILABLE',
      iniciadaEm: agoraEnvio,
      concluidaEm: agoraEnvio,
    },
    create: {
      id: ids.analises[1],
      redacaoId: redacoes[2].id,
      solicitadaPorId: professor.id,
      status: 'ERRO',
      modelo: 'fixture-demonstracao',
      versaoPrompt:
        'analise-redacao-v3-evidencias-posicionais',
      criteriosSnapshot,
      duracaoMs: 8000,
      mensagemErro:
        'FIXTURE_EXTERNAL_SERVICE_UNAVAILABLE',
      iniciadaEm: agoraEnvio,
      concluidaEm: agoraEnvio,
    },
  })

  const feedbackPublicado = await prisma.feedback.upsert({
    where: { redacaoId: redacoes[3].id },
    update: {},
    create: {
      id: ids.feedbacks[0],
      redacaoId: redacoes[3].id,
    },
  })
  const versaoPublicada =
    await prisma.feedbackVersao.upsert({
      where: {
        feedbackId_numero: {
          feedbackId: feedbackPublicado.id,
          numero: 1,
        },
      },
      update: {
        professorId: professor.id,
        nota: 850,
        competencia1: 160,
        competencia2: 180,
        competencia3: 160,
        competencia4: 170,
        competencia5: 180,
        comentarioGeral:
          'Boa articulação temática. Aprofunde a relação entre o repertório e a proposta de intervenção.',
        status: 'PUBLICADA',
        publicadoEm: agoraEnvio,
      },
      create: {
        id: ids.feedbackVersoes[0],
        feedbackId: feedbackPublicado.id,
        numero: 1,
        professorId: professor.id,
        nota: 850,
        competencia1: 160,
        competencia2: 180,
        competencia3: 160,
        competencia4: 170,
        competencia5: 180,
        comentarioGeral:
          'Boa articulação temática. Aprofunde a relação entre o repertório e a proposta de intervenção.',
        status: 'PUBLICADA',
        publicadoEm: agoraEnvio,
      },
    })

  for (const criterio of criterios) {
    await prisma.feedbackCriterio.upsert({
      where: {
        feedbackVersaoId_criterioId: {
          feedbackVersaoId: versaoPublicada.id,
          criterioId: criterio.id,
        },
      },
      update: {
        comentario: `Comentário demonstrativo para ${criterio.nome}.`,
      },
      create: {
        feedbackVersaoId: versaoPublicada.id,
        criterioId: criterio.id,
        comentario: `Comentário demonstrativo para ${criterio.nome}.`,
      },
    })
  }

  const feedbackRascunho = await prisma.feedback.upsert({
    where: { redacaoId: redacoes[4].id },
    update: {},
    create: {
      id: ids.feedbacks[1],
      redacaoId: redacoes[4].id,
    },
  })

  await prisma.feedbackVersao.upsert({
    where: {
      feedbackId_numero: {
        feedbackId: feedbackRascunho.id,
        numero: 1,
      },
    },
    update: {
      professorId: professor.id,
      nota: null,
      competencia1: 160,
      competencia2: null,
      competencia3: null,
      competencia4: null,
      competencia5: null,
      comentarioGeral:
        'Correção iniciada e ainda não publicada.',
      status: 'RASCUNHO',
      publicadoEm: null,
    },
    create: {
      id: ids.feedbackVersoes[1],
      feedbackId: feedbackRascunho.id,
      numero: 1,
      professorId: professor.id,
      competencia1: 160,
      comentarioGeral:
        'Correção iniciada e ainda não publicada.',
      status: 'RASCUNHO',
    },
  })

  await prisma.notificacao.upsert({
    where: { id: ids.notificacao },
    update: {
      usuarioId: alunos[3].id,
      feedbackVersaoId: versaoPublicada.id,
      tipo: 'FEEDBACK_PUBLICADO',
      titulo: 'Correção disponível',
      mensagem:
        'Sua correção de demonstração está disponível na plataforma.',
      lidaEm: null,
      emailDestino: alunos[3].email,
      statusEmail: 'PENDENTE',
      tentativasEmail: 0,
      emailEnviadoEm: null,
      proximaTentativaEm: null,
      ultimoErroEmail: null,
    },
    create: {
      id: ids.notificacao,
      usuarioId: alunos[3].id,
      feedbackVersaoId: versaoPublicada.id,
      tipo: 'FEEDBACK_PUBLICADO',
      titulo: 'Correção disponível',
      mensagem:
        'Sua correção de demonstração está disponível na plataforma.',
      emailDestino: alunos[3].email,
      statusEmail: 'PENDENTE',
    },
  })

  console.log('Seed de demonstração concluído.')
  console.log(
    'Professor: professor.demo@lexis.example.com',
  )
  console.log(
    'Alunos: aluno1.demo@lexis.example.com até aluno5.demo@lexis.example.com',
  )
  console.log(`Senha comum: ${SENHA_DEMONSTRACAO}`)
  console.log(`Turma: ${turma.nome} (${turma.codigoAcesso})`)
}

main()
  .catch((erro) => {
    console.error('Falha ao executar o seed de demonstração.')
    console.error(erro)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
