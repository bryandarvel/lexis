import {
  useEffect,
  useRef,
  useState,
} from 'react'

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
} from '../../utils/minha-turma.js'

const classeBotaoContorno =
  'inline-flex h-11 items-center justify-center rounded-lg border border-[var(--aluno-borda-campo)] px-5 text-[13px] font-semibold leading-[18px] text-lexis-100 transition-colors hover:bg-[var(--aluno-neutro-fundo)] disabled:cursor-not-allowed disabled:opacity-60'

const classeBotaoSair =
  'inline-flex h-11 items-center justify-center rounded-lg bg-[var(--aluno-erro-solido)] px-5 text-[13px] font-semibold leading-[18px] text-[#ffffff] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60'

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
      <p className="text-xs font-semibold leading-[17px] text-lexis-100">
        {titulo}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-[17px] text-lexis-200">
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
  const dialogoRef = useRef(null)
  const voltarRef = useRef(null)
  const fecharRef = useRef(null)
  const [estado, setEstado] = useState(ESTADO_INICIAL)
  const [etapa, setEtapa] = useState('detalhes')
  const [saindo, setSaindo] = useState(false)
  const [erroSaida, setErroSaida] = useState('')

  useEffect(() => {
    const dialogo = dialogoRef.current

    if (!dialogo) return

    if (aberto && !dialogo.open) {
      dialogo.showModal()
    }

    if (!aberto && dialogo.open) {
      dialogo.close()
      // O item do menu que abriu o diálogo já não existe; o foco volta ao avatar.
      retornoFocoRef?.current?.focus()
    }
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
    if (saindo) return

    setSaindo(true)
    setErroSaida('')

    try {
      await sairDaTurma()
      notificarMatriculaAtualizada({
        acao: 'saiu',
        turma: estado.matricula?.turma ?? null,
      })
      setSaindo(false)
      onSaiu(estado.matricula?.turma ?? null)
    } catch (erro) {
      setSaindo(false)
      setErroSaida(mensagemErroMinhaTurma(erro))

      if (obterCodigoErroApi(erro) === CODIGO_SEM_MATRICULA) {
        // A matrícula já não existe: o painel precisa refletir o estado sem turma.
        notificarMatriculaAtualizada({ acao: 'sem-turma' })
        setEstado({ ...ESTADO_INICIAL, status: 'sem-turma' })
        setEtapa('detalhes')
      }
    }
  }

  const { matricula, pendencias } = estado
  const confirmando =
    etapa === 'confirmar' && estado.status === 'pronto'
  const semPendencias =
    pendencias &&
    pendencias.rascunhos.length === 0 &&
    pendencias.aguardandoCorrecao.length === 0

  return (
    <dialog
      ref={dialogoRef}
      aria-labelledby="titulo-minha-turma"
      aria-describedby="descricao-minha-turma"
      aria-busy={estado.status === 'carregando' || saindo}
      onCancel={(evento) => {
        evento.preventDefault()
        fechar()
      }}
      onClose={() => {
        if (aberto) onFechar()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[var(--surface-border)] bg-lexis-900 p-6 text-lexis-50 backdrop:bg-[rgba(3,12,24,0.6)]"
    >
      {aberto && (
        <>
          <h2
            id="titulo-minha-turma"
            className="aluno-titulo-interface text-xl font-semibold leading-[26px] tracking-[-0.16px]"
          >
            {confirmando ? 'Sair da turma?' : 'Minha turma'}
          </h2>

          {estado.status === 'carregando' && (
            <p
              id="descricao-minha-turma"
              role="status"
              className="mt-2 text-sm leading-[22px] text-lexis-200"
            >
              Carregando sua turma…
            </p>
          )}

          {estado.status === 'erro' && (
            <p
              id="descricao-minha-turma"
              role="alert"
              className="mt-2 text-sm leading-[22px] text-[var(--aluno-erro)]"
            >
              {estado.mensagem}
            </p>
          )}

          {estado.status === 'sem-turma' && (
            <p
              id="descricao-minha-turma"
              className="mt-2 text-sm leading-[22px] text-lexis-200"
            >
              Você não participa de uma turma no momento. Para entrar em uma, use o código de acesso no painel.
            </p>
          )}

          {estado.status === 'pronto' && !confirmando && (
            <>
              <p
                id="descricao-minha-turma"
                className="sr-only"
              >
                Dados da turma em que você está matriculado.
              </p>
              <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm leading-[22px]">
                <dt className="text-lexis-200">Turma</dt>
                <dd className="font-semibold text-lexis-50">
                  {matricula.turma}
                </dd>
                <dt className="text-lexis-200">Professor</dt>
                <dd className="text-lexis-100">
                  {matricula.professor ?? 'Não informado'}
                </dd>
                <dt className="text-lexis-200">Na turma desde</dt>
                <dd className="text-lexis-100">
                  {matricula.desde ?? 'Data indisponível'}
                </dd>
              </dl>
              {!matricula.podeSair && (
                <p className="mt-4 text-xs leading-[17px] text-lexis-200">
                  Esta turma foi arquivada pelo professor.
                </p>
              )}
            </>
          )}

          {confirmando && (
            <>
              <div
                id="descricao-minha-turma"
                className="mt-2 space-y-2 text-sm leading-[22px] text-lexis-200"
              >
                <p>
                  Você vai sair de <strong className="font-semibold text-lexis-50">{matricula.turma}</strong>.
                </p>
                <p>
                  Suas redações e correções continuam visíveis. Rascunhos ficam salvos, mas só voltam a ser editáveis se você voltar a esta mesma turma. Redações já enviadas continuam sendo corrigidas pelo professor, e você continua recebendo as notificações.
                </p>
              </div>

              <div className="mt-4 rounded-lg bg-[var(--aluno-neutro-fundo)] p-3">
                {pendencias === null ? (
                  <p className="text-xs leading-[17px] text-lexis-200">
                    Não foi possível conferir seus rascunhos nesta turma. Eles continuam salvos no servidor.
                  </p>
                ) : semPendencias ? (
                  <p className="text-xs leading-[17px] text-lexis-200">
                    Você não tem rascunhos nem redações aguardando correção nesta turma.
                  </p>
                ) : (
                  <>
                    <ListaPendencias
                      titulo="Rascunhos que ficam salvos:"
                      itens={pendencias.rascunhos}
                    />
                    <ListaPendencias
                      titulo="Redações aguardando correção:"
                      itens={pendencias.aguardandoCorrecao}
                    />
                  </>
                )}
              </div>
            </>
          )}

          {erroSaida && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-[var(--aluno-neutro-fundo)] px-3.5 py-2.5 text-sm font-medium leading-[22px] text-[var(--aluno-erro)]"
            >
              {erroSaida}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {confirmando ? (
              <>
                <button
                  ref={voltarRef}
                  type="button"
                  disabled={saindo}
                  onClick={() => {
                    setErroSaida('')
                    setEtapa('detalhes')
                  }}
                  className={classeBotaoContorno}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={saindo}
                  onClick={confirmarSaida}
                  className={classeBotaoSair}
                >
                  {saindo ? 'Saindo da turma…' : 'Sair da turma'}
                </button>
              </>
            ) : (
              <>
                <button
                  ref={fecharRef}
                  type="button"
                  onClick={fechar}
                  className={classeBotaoContorno}
                >
                  Fechar
                </button>
                {estado.status === 'pronto' && matricula.podeSair && (
                  <button
                    type="button"
                    onClick={() => setEtapa('confirmar')}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--aluno-erro)] px-5 text-[13px] font-semibold leading-[18px] text-[var(--aluno-erro)] transition-colors hover:bg-[var(--aluno-neutro-fundo)]"
                  >
                    Sair da turma
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </dialog>
  )
}
