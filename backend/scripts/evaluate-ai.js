import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  compararEvidencias,
  resumirAvaliacoes,
} from '../src/modules/avaliacao-ia/analise-ia.evaluation.js'
import {
  criarSolicitacaoAnaliseIa,
  VERSAO_PROMPT_ANALISE_IA,
} from '../src/modules/avaliacao-ia/analise-ia.prompt.js'
import {
  interpretarResultadoAnaliseIa,
} from '../src/modules/avaliacao-ia/analise-ia.schemas.js'

const diretorioBackend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const caminhoFixturePadrao = path.join(
  diretorioBackend,
  'evaluation',
  'fixtures',
  'synthetic-v1.json',
)
const diretorioSaidaPadrao = path.join(
  diretorioBackend,
  'output',
  'ai-evaluation',
)

function lerArgumentos(argumentos) {
  const opcoes = {
    modo: 'fixture',
    entrada: caminhoFixturePadrao,
    saida: diretorioSaidaPadrao,
    limite: 1,
    confirmarCusto: false,
    rotulo: VERSAO_PROMPT_ANALISE_IA,
  }

  for (const argumento of argumentos) {
    if (argumento === '--confirmar-custo') {
      opcoes.confirmarCusto = true
      continue
    }

    const [nome, ...partesValor] = argumento.split('=')
    const valor = partesValor.join('=')

    if (nome === '--modo') opcoes.modo = valor
    else if (nome === '--entrada') opcoes.entrada = path.resolve(valor)
    else if (nome === '--saida') opcoes.saida = path.resolve(valor)
    else if (nome === '--limite') opcoes.limite = Number(valor)
    else if (nome === '--rotulo') opcoes.rotulo = valor
    else throw new Error(`Argumento desconhecido: ${argumento}`)
  }

  if (!['fixture', 'real'].includes(opcoes.modo)) {
    throw new Error('--modo deve ser fixture ou real.')
  }

  if (!Number.isInteger(opcoes.limite) || opcoes.limite < 1) {
    throw new Error('--limite deve ser um número inteiro positivo.')
  }

  if (opcoes.limite > 20) {
    throw new Error('--limite não pode ultrapassar 20 casos por execução.')
  }

  if (opcoes.modo === 'real') {
    if (!opcoes.confirmarCusto) {
      throw new Error(
        'O modo real exige --confirmar-custo para evitar chamadas acidentais.',
      )
    }

    if (process.env.AI_EVALUATION_REAL_ENABLED !== 'true') {
      throw new Error(
        'O modo real exige AI_EVALUATION_REAL_ENABLED=true no ambiente.',
      )
    }
  }

  return opcoes
}

function validarConjunto(conjunto) {
  if (!conjunto || !Array.isArray(conjunto.casos)) {
    throw new Error('O arquivo de entrada não contém uma lista de casos.')
  }

  for (const caso of conjunto.casos) {
    if (
      !caso.id ||
      !caso.tema?.enunciado ||
      !caso.texto ||
      !Array.isArray(caso.criterios) ||
      !Array.isArray(caso.referenciaHumana?.evidencias)
    ) {
      throw new Error(`Caso inválido: ${caso.id ?? 'sem identificador'}.`)
    }

    for (const evidencia of caso.referenciaHumana.evidencias) {
      const trechoReal = caso.texto.slice(
        evidencia.inicio,
        evidencia.fim,
      )

      if (trechoReal !== evidencia.trecho) {
        throw new Error(
          `Referência humana inválida no caso ${caso.id}: posição e trecho divergem.`,
        )
      }
    }
  }
}

function metricasSemPrevisao(caso) {
  return {
    verdadeirosPositivos: 0,
    falsosPositivos: 0,
    falsosNegativos: caso.referenciaHumana.evidencias.length,
    ambiguas: 0,
    naoLocalizadas: 0,
  }
}

async function obterRespostaReal(solicitacao) {
  const [{ gerarConteudoComGemini }, { env }] = await Promise.all([
    import('../src/integrations/gemini.client.js'),
    import('../src/config/env.js'),
  ])

  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não está configurada.')
  }

  const resposta = await gerarConteudoComGemini({
    input: solicitacao.input,
    systemInstruction: solicitacao.systemInstruction,
    responseFormat: solicitacao.responseFormat,
    generationConfig: solicitacao.generationConfig,
  })

  return {
    texto: resposta.texto,
    modelo: env.GEMINI_MODEL,
  }
}

async function avaliarCaso(caso, opcoes) {
  const solicitacao = criarSolicitacaoAnaliseIa({
    texto: caso.texto,
    tema: caso.tema,
    criterios: caso.criterios,
  })
  const inicio = performance.now()

  try {
    const resposta =
      opcoes.modo === 'fixture'
        ? {
            texto: JSON.stringify(caso.respostaFixture),
            modelo: 'FIXTURE_SEM_CHAMADA_EXTERNA',
          }
        : await obterRespostaReal(solicitacao)
    const resultado = interpretarResultadoAnaliseIa({
      texto: resposta.texto,
      criterios: caso.criterios,
      textoRedacao: caso.texto,
    })

    return {
      id: caso.id,
      status: 'VALIDA',
      modelo: resposta.modelo,
      versaoPrompt: solicitacao.versaoPrompt,
      latenciaMs:
        opcoes.modo === 'fixture'
          ? 0
          : Math.round(performance.now() - inicio),
      metricasEvidencias: compararEvidencias({
        resultado,
        referenciaHumana: caso.referenciaHumana,
      }),
      resultado,
      erro: null,
    }
  } catch (erro) {
    const estruturaInvalida =
      erro?.code === 'GEMINI_INVALID_ANALYSIS'

    return {
      id: caso.id,
      status: estruturaInvalida ? 'INVALIDA' : 'FALHA',
      modelo:
        opcoes.modo === 'fixture'
          ? 'FIXTURE_SEM_CHAMADA_EXTERNA'
          : null,
      versaoPrompt: solicitacao.versaoPrompt,
      latenciaMs:
        opcoes.modo === 'fixture'
          ? 0
          : Math.round(performance.now() - inicio),
      metricasEvidencias: metricasSemPrevisao(caso),
      resultado: null,
      erro: {
        codigo: erro?.code ?? 'AI_EVALUATION_FAILURE',
        mensagem: erro?.message ?? 'Falha desconhecida.',
      },
    }
  }
}

function valorLegivel(valor) {
  return valor === null ? 'N/A' : String(valor)
}

function criarMarkdown(relatorio) {
  const m = relatorio.metricas

  return `# Avaliação reproduzível da análise por IA

## Identificação

- Execução: ${relatorio.execucaoId}
- Modo: **${relatorio.modo}**
- Conjunto: ${relatorio.conjunto.nome} (${relatorio.conjunto.tipo})
- Versão do prompt: ${relatorio.versaoPrompt}
- Rótulo comparativo: ${relatorio.rotulo}
- Casos executados: ${m.casos}

## Aviso metodológico

${relatorio.avisoMetodologico}

## Métricas compatíveis com a saída atual

| Métrica | Resultado |
| --- | ---: |
| Respostas válidas | ${m.respostasValidas} |
| Respostas inválidas | ${m.respostasInvalidas} |
| Falhas | ${m.falhas} |
| Taxa de respostas inválidas | ${valorLegivel(m.taxaRespostasInvalidas)} |
| Latência média (ms) | ${valorLegivel(m.latenciaMediaMs)} |
| Precisão de evidências | ${valorLegivel(m.precisaoEvidencias)} |
| Revocação de evidências | ${valorLegivel(m.revocacaoEvidencias)} |
| F1 de evidências | ${valorLegivel(m.f1Evidencias)} |
| Evidências ambíguas | ${m.ambiguas} |
| Evidências não localizadas | ${m.naoLocalizadas} |

**Notas:** ${m.concordanciaNotas.status} — ${m.concordanciaNotas.motivo}

## Casos

${relatorio.casos
  .map(
    (caso) =>
      `- **${caso.id}**: ${caso.status}; latência ${caso.latenciaMs} ms; ` +
      `VP ${caso.metricasEvidencias.verdadeirosPositivos}, ` +
      `FP ${caso.metricasEvidencias.falsosPositivos}, ` +
      `FN ${caso.metricasEvidencias.falsosNegativos}.`,
  )
  .join('\n')}

## Interpretação responsável

- Teste de integração comprova que componentes se comunicam conforme o contrato.
- Demonstração manual comprova um cenário observado, não a qualidade geral.
- Avaliação do prompt compara versões sob o mesmo conjunto e métricas.
- Avaliação do sistema de IA requer amostra representativa, referências humanas e análise estatística.
- Validação acadêmica requer protocolo, avaliadores, amostragem e discussão de limitações.
`
}

async function executar() {
  const opcoes = lerArgumentos(process.argv.slice(2))
  const conjunto = JSON.parse(
    await readFile(opcoes.entrada, 'utf8'),
  )
  validarConjunto(conjunto)

  const casosSelecionados = conjunto.casos.slice(0, opcoes.limite)
  const casos = []

  for (const caso of casosSelecionados) {
    casos.push(await avaliarCaso(caso, opcoes))
  }

  const execucaoId = `${new Date().toISOString()}-${opcoes.modo}`
  const relatorio = {
    schemaVersion: 1,
    execucaoId,
    modo: opcoes.modo.toUpperCase(),
    rotulo: opcoes.rotulo,
    versaoPrompt: VERSAO_PROMPT_ANALISE_IA,
    conjunto: {
      nome: conjunto.conjunto,
      tipo: conjunto.tipo,
      proposito: conjunto.proposito,
    },
    avisoMetodologico:
      opcoes.modo === 'fixture'
        ? 'Resultados sintéticos validam somente o funcionamento do harness. Não representam desempenho do Gemini nem evidência científica.'
        : 'Resultados de uma execução real isolada não constituem validação científica. Use amostra humana autorizada e protocolo acadêmico.',
    metricas: resumirAvaliacoes(casos),
    casos,
  }

  await mkdir(opcoes.saida, { recursive: true })
  const caminhoJson = path.join(opcoes.saida, 'latest.json')
  const caminhoMarkdown = path.join(opcoes.saida, 'latest.md')

  await Promise.all([
    writeFile(caminhoJson, `${JSON.stringify(relatorio, null, 2)}\n`),
    writeFile(caminhoMarkdown, criarMarkdown(relatorio)),
  ])

  console.log(`Avaliação concluída em modo ${relatorio.modo}.`)
  console.log(`JSON: ${caminhoJson}`)
  console.log(`Markdown: ${caminhoMarkdown}`)
  console.log(
    relatorio.avisoMetodologico,
  )
}

await executar()
