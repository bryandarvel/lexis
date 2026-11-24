import { useCallback, useEffect, useState } from 'react'
import Botao from '../../components/base/Botao.jsx'
import { Link } from 'react-router'
import IconePerfil from '../../components/conta/IconePerfil.jsx'

import AppShell from '../../layouts/AppShell.jsx'
import EditorConta from '../../components/conta/EditorConta.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRotaEnviarRedacao } from '../../hooks/useRotaEnviarRedacao.js'
import { obterMinhaConta } from '../../services/conta.js'
import { obterMinhaMatricula } from '../../services/turmas.js'
import {
  descreverConta,
  descreverTurma,
  aplicarBlocosDaConta,
  resolverBloco,
} from '../../utils/aluno-perfil.js'
import {
  estadoDaContaAtual,
  marcarConta,
} from '../../utils/identidade-sessao.js'
import { indicaSemMatricula } from '../../utils/minha-turma.js'
import './aluno-perfil.css'

const CARREGANDO = { status: 'carregando', dados: null }

const BLOCOS = {
  conta: {
    titulo: 'Conta',
    carregando: 'Carregando sua conta',
    erro: 'Não foi possível carregar os dados da sua conta.',
    carregar: obterMinhaConta,
  },
  turma: {
    titulo: 'Turma e professor',
    carregando: 'Carregando sua turma',
    erro: 'Não foi possível carregar sua turma.',
    carregar: obterMinhaMatricula,
    // Aluno sem matrícula ativa (nunca entrou ou saiu) não é erro.
    aceitarRejeicao: (motivo) =>
      indicaSemMatricula(motivo)
        ? { status: 'sem-turma', dados: null }
        : null,
  },
}

function Bloco({ chave, estado, onTentar, largo = false, children }) {
  const { titulo, carregando, erro } = BLOCOS[chave]
  const idTitulo = `perfil-${chave}`

  return (
    <section
      aria-labelledby={idTitulo}
      className={`aluno-pf-cartao${largo ? ' aluno-pf-largo' : ''}${
        estado.status === 'erro' ? ' aluno-pf-erro' : ''
      }`}
    >
      <h2 id={idTitulo}><IconePerfil tipo={chave} />{titulo}</h2>

      {estado.status === 'carregando' && (
        <div role="status" aria-label={carregando}>
          <div className="aluno-pf-linha" aria-hidden="true" />
          <div className="aluno-pf-linha" aria-hidden="true" />
          <div className="aluno-pf-linha" aria-hidden="true" />
        </div>
      )}

      {estado.status === 'erro' && (
        <div role="alert">
          <p className="aluno-pf-texto">{erro}</p>
          <Botao
            type="button"
            onClick={onTentar}>
            Tentar novamente
          </Botao>
        </div>
      )}

      {(estado.status === 'pronto' || estado.status === 'sem-turma') &&
        children}
    </section>
  )
}

function Campos({ itens }) {
  return (
    <dl className="aluno-pf-campos">
      {itens.map(([rotulo, valor]) => (
        <div key={rotulo}>
          <dt>{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function BlocoConta({ estado, onTentar, children }) {
  const conta = descreverConta(estado.dados)

  if (estado.status === 'pronto' && conta) {
    return <div className="aluno-pf-largo"><EditorConta membroDesde={conta.membroDesde}>{children}</EditorConta></div>
  }

  return (
    <><Bloco chave="conta" estado={estado} onTentar={onTentar} />{children}</>
  )
}

function BlocoTurma({ estado, onTentar }) {
  const turma = descreverTurma(estado.dados)

  return (
    <Bloco chave="turma" estado={estado} onTentar={onTentar}>
      {estado.status === 'sem-turma' || !turma ? (
        <>
          <p className="aluno-pf-texto">
            Você não está em nenhuma turma no momento. Para entrar em
            uma, use o código de acesso que seu professor passou, no
            painel.
          </p>
          <Botao as={Link} to="/aluno" variante="secundario">
            Ir para o painel
          </Botao>
        </>
      ) : (
        <Campos
          itens={[
            ['Turma', turma.turma],
            ['Professor', turma.professor ?? 'Não informado'],
            ['Na turma desde', turma.desde ?? 'Não informado'],
          ]}
        />
      )}
    </Bloco>
  )
}

/*
 * Issue #178: o bloco "Desempenho" saiu daqui e vive no Início, acima das
 * propostas da turma, com os mesmos indicadores. `resumirDesempenho` continua
 * em utils/aluno-perfil.js, agora consumido por lá.
 */

const BLOCOS_CARREGANDO = {
  conta: CARREGANDO,
  turma: CARREGANDO,
}

const ESTADO_INICIAL = marcarConta({ blocos: BLOCOS_CARREGANDO }, null)

export default function AlunoPerfilPage() {
  const rotaEnviarRedacao = useRotaEnviarRedacao()
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? null
  const [estado, setEstado] = useState(ESTADO_INICIAL)

  // A regra está em aplicarBlocosDaConta, com testes: a resposta de outra conta é ignorada.
  const aplicarSeForDaConta = useCallback((conta, atualizar) => {
    setEstado((atual) => aplicarBlocosDaConta(atual, conta, atualizar))
  }, [])

  useEffect(() => {
    let ativo = true
    // A conta desta consulta. Respostas dela não podem preencher a tela de
    // outra pessoa depois de uma reautenticação.
    const contaDaConsulta = usuarioId

    setEstado(marcarConta({ blocos: BLOCOS_CARREGANDO }, contaDaConsulta))

    if (!contaDaConsulta) return undefined

    const chaves = Object.keys(BLOCOS)

    // Cada bloco tem carregamento e erro próprios: a falha de um não derruba os outros.
    Promise.allSettled(
      chaves.map((chave) => BLOCOS[chave].carregar()),
    ).then((resultados) => {
      if (!ativo) return

      aplicarSeForDaConta(contaDaConsulta, () =>
        Object.fromEntries(
          chaves.map((chave, indice) => [
            chave,
            resolverBloco(resultados[indice], BLOCOS[chave]),
          ]),
        ),
      )
    })

    return () => {
      ativo = false
    }
  }, [usuarioId, aplicarSeForDaConta])

  const tentarNovamente = useCallback(
    (chave) => {
      const contaDaConsulta = usuarioId

      if (!contaDaConsulta) return

      aplicarSeForDaConta(contaDaConsulta, (blocos) => ({
        ...blocos,
        [chave]: CARREGANDO,
      }))

      BLOCOS[chave]
        .carregar()
        .then(
          (valor) => ({ status: 'fulfilled', value: valor }),
          (motivo) => ({ status: 'rejected', reason: motivo }),
        )
        .then((resultado) => {
          aplicarSeForDaConta(contaDaConsulta, (blocos) => ({
            ...blocos,
            [chave]: resolverBloco(resultado, BLOCOS[chave]),
          }))
        })
    },
    [usuarioId, aplicarSeForDaConta],
  )

  // O render nunca usa dados de outra conta: na troca, tudo volta ao carregando.
  const { blocos } = estadoDaContaAtual(estado, usuarioId, ESTADO_INICIAL)

  return (
    <AppShell rotaEnviarRedacao={rotaEnviarRedacao} trilha={['Perfil']}>
      <header>
        <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-texto">
          Perfil
        </h1>
        <p className="mt-[11px] text-base leading-[25px] text-texto-suave">
          Seus dados de conta e sua turma atual.
        </p>
      </header>

      <div className="aluno-pf-grade">
        <BlocoConta
          estado={blocos.conta}
          onTentar={() => tentarNovamente('conta')}
        >
          <BlocoTurma
            estado={blocos.turma}
            onTentar={() => tentarNovamente('turma')}
          />
        </BlocoConta>
      </div>
    </AppShell>
  )
}
