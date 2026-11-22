import Etiqueta from '../../components/base/Etiqueta.jsx'
import { useEffect, useId, useState } from 'react'
import Botao from '../../components/base/Botao.jsx'
import EstadoVazio from '../../components/base/EstadoVazio.jsx'
import { Link } from 'react-router'

import AppShell from '../../layouts/AppShell.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { listarMinhasRedacoes } from '../../services/redacoes.js'
import { listarTemasDoAluno } from '../../services/temas.js'
import { obterMinhaMatricula } from '../../services/turmas.js'
import { obterRotaEnviarRedacao } from '../../utils/aluno-feedback.js'
import {
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
} from '../../utils/identidade-sessao.js'
import {
  FILTROS_SITUACAO,
  ORDENACOES,
  descreverDestino,
  descreverResultado,
  descreverSituacao,
  filtrarRedacoes,
  formatarDataRedacao,
  ordenarRedacoes,
  resumirRedacoes,
  temNotaPublicada,
} from '../../utils/aluno-redacoes.js'
import './aluno-redacoes.css'

function ItemRedacao({ redacao, turmaAtualId }) {
  const situacao = descreverSituacao(redacao)
  const destino = descreverDestino(redacao, { turmaAtualId })
  const data = formatarDataRedacao(redacao)
  const tema = redacao.tema?.enunciado ?? 'Proposta de redação'
  const turma = redacao.tema?.turma?.nome

  return (
    <li className="aluno-redacao">
      <div className="aluno-redacao-info">
        <div className="aluno-redacao-topo">
          <Etiqueta tom={situacao.tom}>{situacao.rotulo}</Etiqueta>
          {data && <span className="aluno-redacao-data">{data}</span>}
        </div>

        <h2 className="aluno-redacao-titulo">{tema}</h2>
        {turma && <p className="aluno-redacao-turma">{turma}</p>}

        {destino.tipo === 'nenhum' && destino.motivo && (
          <p className="aluno-redacao-motivo">{destino.motivo}</p>
        )}

        {destino.aviso && (
          <p className="aluno-redacao-motivo">{destino.aviso}</p>
        )}
      </div>

      <div className="aluno-redacao-lado">
        {temNotaPublicada(redacao) && (
          <p className="aluno-redacao-nota">
            <span className="aluno-redacao-nota-valor">
              {redacao.notaPublicada}
            </span>
            <span aria-hidden="true"> / 1000</span>
            <span className="sr-only"> de 1000 pontos</span>
          </p>
        )}

        {destino.tipo !== 'nenhum' && (
          <Link
            to={destino.para}
            className="aluno-redacao-acao"
            aria-label={`${destino.rotulo}: ${tema}`}
          >
            {destino.rotulo}
          </Link>
        )}
      </div>
    </li>
  )
}

const CARREGANDO = {
  status: 'carregando',
  redacoes: [],
  turmaAtualId: null,
  rotaEnviar: null,
  usuarioId: null,
}

export default function AlunoRedacoesPage() {
  const idFiltro = useId()
  const idOrdem = useId()
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? null
  const [carregamento, setCarregamento] = useState(CARREGANDO)
  const [tentativa, setTentativa] = useState(0)
  const [filtro, setFiltro] = useState('todas')
  const [ordenacao, setOrdenacao] = useState('recentes')

  useEffect(() => {
    let ativo = true
    // A conta desta consulta. Uma resposta que chegue depois de outra pessoa
    // entrar é descartada, em vez de preencher a tela dela.
    const contaDaConsulta = usuarioId

    setCarregamento(marcarConta(CARREGANDO, contaDaConsulta))

    if (!contaDaConsulta) return undefined

    // A lista é o que a página existe para mostrar; a turma atual e as
    // propostas só refinam o link e o item "Enviar redação" da sidebar, então a
    // falha delas não derruba a tela.
    Promise.allSettled([
      listarMinhasRedacoes(),
      obterMinhaMatricula(),
      listarTemasDoAluno(),
    ]).then(([listaResultado, matriculaResultado, temasResultado]) => {
      if (!ativo) return

      if (listaResultado.status === 'rejected') {
        setCarregamento(
          marcarConta({ ...CARREGANDO, status: 'erro' }, contaDaConsulta),
        )
        return
      }

      const redacoes = Array.isArray(listaResultado.value)
        ? listaResultado.value
        : []

      setCarregamento((atual) =>
        // Descarta a resposta se a conta mudou entre o pedido e a chegada.
        mesmaConta(atual.usuarioId, contaDaConsulta)
          ? marcarConta(
              {
                status: 'pronto',
                redacoes,
                turmaAtualId:
                  matriculaResultado.status === 'fulfilled'
                    ? matriculaResultado.value?.turma?.id ?? null
                    : null,
                rotaEnviar:
                  temasResultado.status === 'fulfilled'
                    ? obterRotaEnviarRedacao(temasResultado.value, redacoes)
                    : null,
              },
              contaDaConsulta,
            )
          : atual,
      )
    })

    return () => {
      ativo = false
    }
  }, [tentativa, usuarioId])

  // O render nunca usa estado de outra conta: na troca, volta ao carregando.
  const { status, redacoes, turmaAtualId, rotaEnviar } = estadoDaContaAtual(
    carregamento,
    usuarioId,
    CARREGANDO,
  )
  const resumo = resumirRedacoes(redacoes)
  const visiveis = ordenarRedacoes(
    filtrarRedacoes(redacoes, filtro),
    ordenacao,
  )

  return (
    <AppShell
      rotaEnviarRedacao={rotaEnviar}
      trilha={['Minhas redações']}
    >
      <header>
        <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-texto">
          Minhas redações
        </h1>
        <p className="mt-[11px] text-base leading-[25px] text-texto-suave">
          Acompanhe tudo o que você escreveu, com a situação de cada texto.
        </p>
      </header>

      {status === 'carregando' && (
        <div
          role="status"
          aria-label="Carregando suas redações"
          className="mt-[25px]"
        >
          <ul className="aluno-redacoes-lista" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <li key={item} className="aluno-redacao aluno-esqueleto" />
            ))}
          </ul>
        </div>
      )}

      {status === 'erro' && (
        <section
          role="alert"
          className="aluno-elevacao-1 mt-[25px] max-w-[720px] rounded-cartao border border-[var(--surface-border)] border-l-[3px] border-l-[var(--aluno-erro)] bg-superficie px-6 py-5"
        >
          <h2 className="text-lg font-semibold leading-6 text-texto">
            Não foi possível carregar suas redações
          </h2>
          <p className="mt-2 text-sm leading-[22px] text-texto-suave">
            Verifique sua conexão e tente novamente em instantes.
          </p>
          <Botao
            type="button"
            onClick={() => setTentativa((valor) => valor + 1)}
            className="mt-4">
            Tentar novamente
          </Botao>
        </section>
      )}

      {status === 'pronto' && redacoes.length === 0 && (
        <EstadoVazio
          className="mt-[25px] max-w-[720px]"
          titulo="Você ainda não escreveu nenhuma redação"
          descricao="Quando você começar um rascunho ou enviar uma redação, ela aparece aqui."
          acao={<Botao as={Link} to="/aluno" variante="secundario">Ver propostas no painel</Botao>}
        />
      )}

      {status === 'pronto' && redacoes.length > 0 && (
        <>
          <dl className="aluno-redacoes-resumo" aria-label="Resumo por situação">
            <div><dt>Rascunhos</dt><dd>{resumo.rascunhos}</dd></div>
            <div><dt>Aguardando correção</dt><dd>{resumo.aguardando}</dd></div>
            <div><dt>Corrigidas</dt><dd>{resumo.corrigidas}</dd></div>
          </dl>

          <div className="aluno-redacoes-controles">
            <div className="aluno-controle">
              <label htmlFor={idFiltro}>Situação</label>
              <select
                id={idFiltro}
                value={filtro}
                onChange={(evento) => setFiltro(evento.target.value)}
              >
                {FILTROS_SITUACAO.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="aluno-controle">
              <label htmlFor={idOrdem}>Ordenar por</label>
              <select
                id={idOrdem}
                value={ordenacao}
                onChange={(evento) => setOrdenacao(evento.target.value)}
              >
                {ORDENACOES.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p role="status" className="aluno-redacoes-contagem">
            {descreverResultado(visiveis.length, redacoes.length, filtro)}
          </p>

          {visiveis.length > 0 ? (
            <ul className="aluno-redacoes-lista">
              {visiveis.map((redacao) => (
                <ItemRedacao
                  key={redacao.id}
                  redacao={redacao}
                  turmaAtualId={turmaAtualId}
                />
              ))}
            </ul>
          ) : (
            <EstadoVazio
              className="mt-4 max-w-[720px]"
              titulo="Nenhuma redação nesta situação"
              descricao="Troque o filtro para ver as outras redações."
              acao={<Botao type="button" variante="secundario" onClick={() => setFiltro('todas')}>Mostrar todas</Botao>}
            />
          )}
        </>
      )}
    </AppShell>
  )
}
