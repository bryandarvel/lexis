import {
  useEffect,
  useRef,
  useState,
} from 'react'

import Aviso from '../base/Aviso.jsx'
import Botao from '../base/Botao.jsx'
import Dialogo from '../base/Dialogo.jsx'
import { notificarMatriculaAtualizada } from '../../services/matricula-events.js'
import { listarMinhasRedacoes } from '../../services/redacoes.js'
import {
  obterMinhaMatricula,
  sairDaTurma,
} from '../../services/turmas.js'
import {
  descreverMatricula,
  indicaSemMatricula,
  listarPendenciasDaSaida,
  mensagemErroMinhaTurma,
  obterCodigoErroApi,
  CODIGO_SEM_MATRICULA,
  CODIGO_MATRICULA_ALTERADA,
} from '../../utils/minha-turma.js'

const ESTADO_INICIAL = {
  status: 'carregando',
  matricula: null,
  pendencias: null,
  mensagem: '',
}

async function carregarMinhaTurma() {
  const [resultadoMatricula, resultadoRedacoes] =
    await Promise.allSettled([
      obterMinhaMatricula(),
      listarMinhasRedacoes(),
    ])

  if (resultadoMatricula.status === 'rejected') {
    return indicaSemMatricula(resultadoMatricula.reason)
      ? { ...ESTADO_INICIAL, status: 'sem-turma' }
      : {
          ...ESTADO_INICIAL,
          status: 'erro',
          mensagem: mensagemErroMinhaTurma(
            resultadoMatricula.reason,
          ),
        }
  }

  const matricula = descreverMatricula(
    resultadoMatricula.value,
  )

  return {
    status: 'pronto',
    matricula,
    // Sem a lista, a confirmação avisa que não foi possível conferir as pendências.
    pendencias:
      resultadoRedacoes.status === 'fulfilled'
        ? listarPendenciasDaSaida(
            resultadoRedacoes.value,
            matricula?.turmaId,
          )
        : null,
    mensagem: '',
  }
}

function ListaPendencias({ titulo, itens }) {
  if (itens.length === 0) return null

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold leading-[17px] text-texto">
        {titulo}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-[17px] text-texto-suave">
        {itens.map((item) => (
          <li key={item.id}>{item.enunciado}</li>
        ))}
      </ul>
    </div>
  )
}

export default function MinhaTurmaDialogo({
  aberto,
  onFechar,
  onSaiu,
  retornoFocoRef,
}) {
  const voltarRef = useRef(null)
  const fecharRef = useRef(null)
  const saidaEmAndamentoRef = useRef(false)
  const [estado, setEstado] = useState(ESTADO_INICIAL)
  const [etapa, setEtapa] = useState('detalhes')
  const [saindo, setSaindo] = useState(false)
  const [erroSaida, setErroSaida] = useState('')

  // O item do menu que abriu o diálogo já não existe; o foco volta ao avatar,
  // mas só na transição de aberto para fechado (não na montagem com o diálogo fechado).
  const estavaAbertoRef = useRef(false)
  useEffect(() => {
    if (estavaAbertoRef.current && !aberto) retornoFocoRef?.current?.focus()
    estavaAbertoRef.current = aberto
  }, [aberto, retornoFocoRef])

  useEffect(() => {
    if (!aberto) return undefined

    let ativo = true

    setEstado(ESTADO_INICIAL)
    setEtapa('detalhes')
    setErroSaida('')

    carregarMinhaTurma().then((dados) => {
      if (ativo) setEstado(dados)
    })

    return () => {
      ativo = false
    }
  }, [aberto])

  // Cada etapa começa pela ação segura: Voltar na confirmação e Fechar nos detalhes.
  useEffect(() => {
    if (!aberto) return

    if (etapa === 'confirmar') {
      voltarRef.current?.focus()
    } else {
      fecharRef.current?.focus()
    }
  }, [aberto, etapa, estado.status])

  function fechar() {
    if (!saindo) onFechar()
  }

  async function confirmarSaida() {
    if (saidaEmAndamentoRef.current || etapa !== 'confirmar' ||
      estado.status !== 'pronto' || !estado.matricula?.podeSair) return

    const matriculaConfirmada = estado.matricula
    saidaEmAndamentoRef.current = true
    setSaindo(true)
    setErroSaida('')

    try {
      await sairDaTurma(matriculaConfirmada.matriculaId)
      notificarMatriculaAtualizada({
        acao: 'saiu',
        turma: matriculaConfirmada.turma,
      })
      onSaiu(matriculaConfirmada.turma)
    } catch (erro) {
      setErroSaida(mensagemErroMinhaTurma(erro))

      if (obterCodigoErroApi(erro) === CODIGO_MATRICULA_ALTERADA) {
        // A confirmação antiga nunca serve para a matrícula nova. Reconsulta
        // somente os dados; nenhum DELETE é repetido automaticamente.
        setEtapa('detalhes')
        setEstado(ESTADO_INICIAL)
        setEstado(await carregarMinhaTurma())
        notificarMatriculaAtualizada({ acao: 'atualizada' })
      }

      if (obterCodigoErroApi(erro) === CODIGO_SEM_MATRICULA) {
        // A matrícula já não existe: o painel precisa refletir o estado sem turma.
        notificarMatriculaAtualizada({ acao: 'sem-turma' })
        setEstado({ ...ESTADO_INICIAL, status: 'sem-turma' })
        setEtapa('detalhes')
      }
    } finally {
      saidaEmAndamentoRef.current = false
      setSaindo(false)
    }
  }

  const { matricula, pendencias } = estado
  const confirmando =
    etapa === 'confirmar' && estado.status === 'pronto'
  const semPendencias =
    pendencias &&
    pendencias.rascunhos.length === 0 &&
    pendencias.aguardandoCorrecao.length === 0

  let descricao = null

  if (estado.status === 'carregando') {
    descricao = <p role="status">Carregando sua turma…</p>
  } else if (estado.status === 'erro') {
    descricao = <p role="alert" className="text-erro">{estado.mensagem}</p>
  } else if (estado.status === 'sem-turma') {
    descricao = (
      <p>
        Você não participa de uma turma no momento. Para entrar em uma, use o código de acesso no painel.
      </p>
    )
  } else if (confirmando) {
    descricao = (
      <div className="space-y-2">
        <p>
          Você vai sair de <strong className="font-semibold text-texto">{matricula.turma}</strong>.
        </p>
        <p>
          Suas redações e correções continuam visíveis. Rascunhos ficam salvos, mas só voltam a ser editáveis se você voltar a esta mesma turma. Redações já enviadas continuam sendo
        </p>
      </div>
    )
  } else {
    descricao = <p className="sr-only">Dados da turma em que você está matriculado.</p>
  }

  return (
    <Dialogo
      aberto={aberto}
      ocupado={estado.status === 'carregando' || saindo}
      onFechar={fechar}
      titulo={confirmando ? 'Sair da turma?' : 'Minha turma'}
      descricao={descricao}
    >
      {estado.status === 'pronto' && !confirmando && (
        <>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm leading-[22px]">
            <dt className="text-texto-suave">Turma</dt>
            <dd className="font-semibold text-texto">{matricula.turma}</dd>
            <dt className="text-texto-suave">Professor</dt>
            <dd className="text-texto">{matricula.professor ?? 'Não informado'}</dd>
            <dt className="text-texto-suave">Na turma desde</dt>
            <dd className="text-texto">{matricula.desde ?? 'Data indisponível'}</dd>
          </dl>
          {!matricula.podeSair && (
            <p className="mt-4 text-xs leading-[17px] text-texto-suave">
              Esta turma foi arquivada pelo professor.
            </p>
          )}
        </>
      )}

      {confirmando && (
        <div className="rounded-controle bg-superficie-rebaixada p-3">
          {pendencias === null ? (
            <p className="text-xs leading-[17px] text-texto-suave">
              Não foi possível conferir seus rascunhos nesta turma. Eles continuam salvos no servidor.
            </p>
          ) : semPendencias ? (
            <p className="text-xs leading-[17px] text-texto-suave">
              Você não tem rascunhos nem redações aguardando correção nesta turma.
            </p>
          ) : (
            <>
              <ListaPendencias titulo="Rascunhos que ficam salvos:" itens={pendencias.rascunhos} />
              <ListaPendencias titulo="Redações aguardando correção:" itens={pendencias.aguardandoCorrecao} />
            </>
          )}
        </div>
      )}

      {erroSaida && <Aviso tipo="erro" className="mt-4">{erroSaida}</Aviso>}

      <div className="dialogo-base__rodape">
        {confirmando ? (
          <>
            <Botao
              ref={voltarRef}
              variante="secundario"
              disabled={saindo}
              onClick={() => {
                setErroSaida('')
                setEtapa('detalhes')
              }}
            >
              Voltar
            </Botao>
            <Botao variante="perigo" disabled={saindo} onClick={confirmarSaida}>
              {saindo ? 'Saindo da turma…' : 'Sair da turma'}
            </Botao>
          </>
        ) : (
          <>
            <Botao ref={fecharRef} variante="secundario" onClick={fechar}>
              Fechar
            </Botao>
            {estado.status === 'pronto' && matricula.podeSair && (
              <Botao
                variante="perigo"
                onClick={() => {
                  setErroSaida('')
                  setEtapa('confirmar')
                }}
              >
                Sair da turma
              </Botao>
            )}
          </>
        )}
      </div>
    </Dialogo>
  )
}
