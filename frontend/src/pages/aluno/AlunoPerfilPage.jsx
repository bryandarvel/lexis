import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import AlunoLayout from '../../layouts/AlunoLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useRotaEnviarRedacao } from '../../hooks/useRotaEnviarRedacao.js'
import { obterMinhaConta } from '../../services/conta.js'
import { obterDesempenhoAluno } from '../../services/desempenho.js'
import { obterMinhaMatricula } from '../../services/turmas.js'
import {
  NOTA_DESEMPENHO,
  descreverConta,
  descreverTurma,
  resolverBloco,
  resumirDesempenho,
} from '../../utils/aluno-perfil.js'
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
  desempenho: {
    titulo: 'Desempenho',
    carregando: 'Carregando seu desempenho',
    erro: 'Não foi possível carregar seu desempenho.',
    carregar: obterDesempenhoAluno,
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
      <h2 id={idTitulo}>{titulo}</h2>

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
          <button
            type="button"
            onClick={onTentar}
            className="aluno-pf-botao aluno-pf-botao-primario"
          >
            Tentar novamente
          </button>
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

function BlocoConta({ estado, onTentar }) {
  const conta = descreverConta(estado.dados)

  return (
    <Bloco chave="conta" estado={estado} onTentar={onTentar}>
      {conta && (
        <Campos
          itens={[
            ['Nome', conta.nome],
            ['E-mail', conta.email],
            ['Papel', conta.papel],
            ['Membro desde', conta.membroDesde ?? 'Não informado'],
          ]}
        />
      )}
    </Bloco>
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
          <Link to="/aluno" className="aluno-pf-botao">
            Ir para o painel
          </Link>
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

function BlocoDesempenho({ estado, onTentar }) {
  const resumo = resumirDesempenho(estado.dados)

  return (
    <Bloco chave="desempenho" estado={estado} onTentar={onTentar} largo>
      <dl className="aluno-pf-indicadores">
        {resumo.itens.map((item) => (
          <div key={item.rotulo}>
            <dt>{item.rotulo}</dt>
            <dd>
              {item.valor ?? (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Sem valor ainda</span>
                </>
              )}
              {item.unidade && (
                <span className="aluno-pf-unidade"> {item.unidade}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p className="aluno-pf-texto">
        {resumo.semCorrecao
          ? 'Nenhuma correção publicada ainda. As notas aparecem aqui depois que um professor publica uma correção. '
          : ''}
        {NOTA_DESEMPENHO}
      </p>
    </Bloco>
  )
}

export default function AlunoPerfilPage() {
  const rotaEnviarRedacao = useRotaEnviarRedacao()
  const { sair } = useAuth()
  const navigate = useNavigate()
  const ativoRef = useRef(true)
  const [blocos, setBlocos] = useState({
    conta: CARREGANDO,
    turma: CARREGANDO,
    desempenho: CARREGANDO,
  })
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    ativoRef.current = true

    const chaves = Object.keys(BLOCOS)

    // Cada bloco tem carregamento e erro próprios: a falha de um não derruba os outros.
    Promise.allSettled(
      chaves.map((chave) => BLOCOS[chave].carregar()),
    ).then((resultados) => {
      if (!ativoRef.current) return

      setBlocos(
        Object.fromEntries(
          chaves.map((chave, indice) => [
            chave,
            resolverBloco(resultados[indice], BLOCOS[chave]),
          ]),
        ),
      )
    })

    return () => {
      ativoRef.current = false
    }
  }, [])

  const tentarNovamente = useCallback((chave) => {
    setBlocos((atual) => ({ ...atual, [chave]: CARREGANDO }))

    BLOCOS[chave]
      .carregar()
      .then(
        (valor) => ({ status: 'fulfilled', value: valor }),
        (motivo) => ({ status: 'rejected', reason: motivo }),
      )
      .then((resultado) => {
        if (!ativoRef.current) return

        setBlocos((atual) => ({
          ...atual,
          [chave]: resolverBloco(resultado, BLOCOS[chave]),
        }))
      })
  }, [])

  async function handleSair() {
    if (saindo) return

    setSaindo(true)

    try {
      await sair()
    } catch {
      // A sessão local já é removida pelo AuthProvider.
    }

    navigate('/login', { replace: true })
  }

  return (
    <AlunoLayout rotaEnviarRedacao={rotaEnviarRedacao} trilha={['Perfil']}>
      <header>
        <h1 className="text-[36px] font-semibold leading-[41px] tracking-[-0.65px] text-lexis-50">
          Perfil
        </h1>
        <p className="mt-[11px] text-base leading-[25px] text-lexis-200">
          Seus dados de conta, sua turma e o resumo das suas correções.
        </p>
      </header>

      <div className="aluno-pf-grade">
        <BlocoConta
          estado={blocos.conta}
          onTentar={() => tentarNovamente('conta')}
        />
        <BlocoTurma
          estado={blocos.turma}
          onTentar={() => tentarNovamente('turma')}
        />
        <BlocoDesempenho
          estado={blocos.desempenho}
          onTentar={() => tentarNovamente('desempenho')}
        />

        <section
          aria-labelledby="perfil-sessao"
          className="aluno-pf-cartao aluno-pf-largo"
        >
          <h2 id="perfil-sessao">Sessão</h2>
          <div className="aluno-pf-sessao">
            <p className="aluno-pf-texto">
              A edição de nome e senha ainda não está disponível e chega
              em uma próxima etapa.
            </p>
            <button
              type="button"
              onClick={handleSair}
              disabled={saindo}
              className="aluno-pf-botao"
            >
              {saindo ? 'Saindo…' : 'Sair da conta'}
            </button>
          </div>
        </section>
      </div>
    </AlunoLayout>
  )
}
