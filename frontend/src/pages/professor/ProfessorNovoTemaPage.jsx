import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router'

import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import {
  criarTema,
  obterModeloCompetenciaDois,
} from '../../services/temas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import {
  criarCriterioVazio,
  criarCriteriosDoModelo,
  moverCriterio,
  prepararTemaParaEnvio,
  validarFormularioTema,
} from '../../utils/topic-form.js'

function criarFormulario(criterios) {
  return {
    enunciado: '',
    descricao: '',
    instrucoes: '',
    prazoEntrega: '',
    criterios,
  }
}

export default function ProfessorNovoTemaPage() {
  const { turmaId } = useParams()
  const navigate = useNavigate()
  const avisoRef = useRef(null)
  const [modelo, setModelo] = useState(null)
  const [formulario, setFormulario] = useState(null)
  const [status, setStatus] = useState('carregando')
  const [aviso, setAviso] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true

    async function carregarModelo() {
      setStatus('carregando')
      setAviso(null)

      try {
        const modeloRecebido =
          await obterModeloCompetenciaDois()

        if (!ativo) {
          return
        }

        setModelo(modeloRecebido)
        setFormulario(
          criarFormulario(
            criarCriteriosDoModelo(modeloRecebido),
          ),
        )
        setStatus('pronto')
      } catch (error) {
        if (!ativo) {
          return
        }

        setAviso({
          tipo: 'erro',
          mensagem: interpretarErroApi(
            error,
            'Não foi possível carregar o modelo de critérios.',
          ).mensagem,
        })
        setStatus('erro')
      }
    }

    carregarModelo()

    return () => {
      ativo = false
    }
  }, [tentativa])

  function atualizarCampo(campo, valor) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }))
    setAviso(null)
  }

  function atualizarCriterio(idLocal, campo, valor) {
    setFormulario((atual) => ({
      ...atual,
      criterios: atual.criterios.map((criterio) =>
        criterio.idLocal === idLocal
          ? { ...criterio, [campo]: valor }
          : criterio,
      ),
    }))
    setAviso(null)
  }

  function reordenarCriterio(indice, deslocamento) {
    setFormulario((atual) => ({
      ...atual,
      criterios: moverCriterio(
        atual.criterios,
        indice,
        deslocamento,
      ),
    }))
  }

  function removerCriterio(idLocal) {
    setFormulario((atual) => ({
      ...atual,
      criterios: atual.criterios.filter(
        (criterio) => criterio.idLocal !== idLocal,
      ),
    }))
  }

  function restaurarModelo() {
    setFormulario((atual) => ({
      ...atual,
      criterios: criarCriteriosDoModelo(modelo),
    }))
    setAviso({
      tipo: 'sucesso',
      mensagem:
        'O modelo da Competência II foi restaurado. Você ainda pode editar todos os campos.',
    })
  }

  function iniciarCriterioPersonalizado() {
    setFormulario((atual) => ({
      ...atual,
      criterios: [criarCriterioVazio()],
    }))
    setAviso({
      tipo: 'sucesso',
      mensagem:
        'Modelo removido deste formulário. Defina seus próprios critérios.',
    })
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    const erroValidacao =
      validarFormularioTema(formulario)

    if (erroValidacao) {
      setAviso({
        tipo: 'erro',
        mensagem: erroValidacao,
      })
      globalThis.setTimeout(
        () => avisoRef.current?.focus(),
        0,
      )
      return
    }

    setStatus('salvando')
    setAviso(null)

    try {
      const tema = await criarTema(
        turmaId,
        prepararTemaParaEnvio(formulario),
      )

      navigate(`/professor/temas/${tema.id}`, {
        replace: true,
      })
    } catch (error) {
      setAviso({
        tipo: 'erro',
        mensagem: interpretarErroApi(
          error,
          'Não foi possível criar o tema.',
        ).mensagem,
      })
      setStatus('pronto')
      globalThis.setTimeout(
        () => avisoRef.current?.focus(),
        0,
      )
    }
  }

  if (status === 'carregando') {
    return (
      <DashboardLayout>
        <div
          className="mx-auto max-w-5xl px-6 py-16"
          role="status"
        >
          <div className="h-10 w-72 animate-pulse rounded-[10px] bg-lexis-300/15" />
          <div className="mt-8 h-[34rem] animate-pulse rounded-[14px] bg-lexis-300/10" />
          <span className="sr-only">
            Carregando modelo de critérios...
          </span>
        </div>
      </DashboardLayout>
    )
  }

  if (status === 'erro') {
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Link
            to={`/professor/turmas/${turmaId}`}
            className="text-sm font-semibold text-lexis-300 hover:text-white"
          >
            ← Voltar à turma
          </Link>
          <div
            role="alert"
            className="mt-8 rounded-[14px] border border-red-300/25 bg-red-950/25 p-6 text-red-100"
          >
            {aviso?.mensagem}
          </div>
          <button
            type="button"
            onClick={() => setTentativa((valor) => valor + 1)}
            className="mt-5 min-h-11 rounded-[10px] bg-lexis-400 px-5 font-bold text-white"
          >
            Tentar novamente
          </button>
        </section>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <header className="border-b border-lexis-200/10 px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <Link
            to={`/professor/turmas/${turmaId}`}
            className="text-sm font-semibold text-lexis-300 hover:text-white"
          >
            ← Voltar à turma
          </Link>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-lexis-300">
            Nova proposta
          </p>
          <h1 className="mt-3 font-editorial text-4xl font-semibold text-white sm:text-5xl">
            Criar tema de redação
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-lexis-200">
            O modelo abaixo observa repertório na Competência II. Ele não representa as cinco competências completas e nenhum critério é obrigatório: edite, reordene, remova ou substitua antes de criar o tema.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl space-y-7 px-6 py-10 sm:px-10"
        aria-busy={status === 'salvando'}
      >
        <section className="surface-card rounded-[14px] p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-white">
            Proposta
          </h2>
          <div className="mt-6 grid gap-6">
            <label className="text-sm font-semibold text-white">
              Enunciado
              <input
                value={formulario.enunciado}
                onChange={(evento) =>
                  atualizarCampo(
                    'enunciado',
                    evento.target.value,
                  )
                }
                minLength={5}
                maxLength={250}
                required
                className="mt-2 min-h-12 w-full rounded-[10px] border border-lexis-200/20 bg-lexis-950/70 px-4 text-white outline-none focus:border-lexis-300 focus:ring-4 focus:ring-lexis-300/15"
              />
            </label>

            <label className="text-sm font-semibold text-white">
              Descrição
              <textarea
                value={formulario.descricao}
                onChange={(evento) =>
                  atualizarCampo(
                    'descricao',
                    evento.target.value,
                  )
                }
                minLength={10}
                maxLength={10000}
                rows={5}
                required
                className="mt-2 w-full rounded-[10px] border border-lexis-200/20 bg-lexis-950/70 px-4 py-3 text-white outline-none focus:border-lexis-300 focus:ring-4 focus:ring-lexis-300/15"
              />
            </label>

            <label className="text-sm font-semibold text-white">
              Instruções adicionais (opcional)
              <textarea
                value={formulario.instrucoes}
                onChange={(evento) =>
                  atualizarCampo(
                    'instrucoes',
                    evento.target.value,
                  )
                }
                maxLength={5000}
                rows={3}
                className="mt-2 w-full rounded-[10px] border border-lexis-200/20 bg-lexis-950/70 px-4 py-3 text-white outline-none focus:border-lexis-300 focus:ring-4 focus:ring-lexis-300/15"
              />
            </label>

            <label className="max-w-sm text-sm font-semibold text-white">
              Prazo de entrega
              <input
                type="datetime-local"
                value={formulario.prazoEntrega}
                onChange={(evento) =>
                  atualizarCampo(
                    'prazoEntrega',
                    evento.target.value,
                  )
                }
                required
                className="mt-2 min-h-12 w-full rounded-[10px] border border-lexis-200/20 bg-lexis-950/70 px-4 text-white outline-none focus:border-lexis-300 focus:ring-4 focus:ring-lexis-300/15"
              />
            </label>
          </div>
        </section>

        <fieldset className="surface-card rounded-[14px] p-5 sm:p-7">
          <legend className="px-2 text-xl font-semibold text-white">
            Critérios de avaliação
          </legend>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-2xl text-sm leading-6 text-lexis-200">
              Modelo {modelo.id}, versão {modelo.versao}. A ordem salva será a ordem apresentada à IA e ao professor.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restaurarModelo}
                className="min-h-11 rounded-[10px] border border-lexis-300/30 px-4 text-sm font-bold text-white"
              >
                Restaurar modelo C2
              </button>
              <button
                type="button"
                onClick={iniciarCriterioPersonalizado}
                className="min-h-11 rounded-[10px] border border-lexis-200/20 px-4 text-sm font-bold text-lexis-100"
              >
                Usar critérios próprios
              </button>
            </div>
          </div>

          <ol className="mt-6 space-y-5">
            {formulario.criterios.map((criterio, indice) => (
              <li
                key={criterio.idLocal}
                className="rounded-[10px] border border-lexis-200/15 bg-lexis-950/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">
                    Critério {indice + 1}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reordenarCriterio(indice, -1)}
                      disabled={indice === 0}
                      aria-label={`Mover critério ${indice + 1} para cima`}
                      className="min-h-10 rounded-lg border border-lexis-200/20 px-3 text-sm text-white disabled:opacity-40"
                    >
                      ↑ Subir
                    </button>
                    <button
                      type="button"
                      onClick={() => reordenarCriterio(indice, 1)}
                      disabled={
                        indice ===
                        formulario.criterios.length - 1
                      }
                      aria-label={`Mover critério ${indice + 1} para baixo`}
                      className="min-h-10 rounded-lg border border-lexis-200/20 px-3 text-sm text-white disabled:opacity-40"
                    >
                      ↓ Descer
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        removerCriterio(criterio.idLocal)
                      }
                      disabled={formulario.criterios.length === 1}
                      aria-label={`Remover critério ${indice + 1}`}
                      className="min-h-10 rounded-lg border border-red-300/25 px-3 text-sm text-red-200 disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="text-sm font-semibold text-white">
                    Nome
                    <input
                      value={criterio.nome}
                      onChange={(evento) =>
                        atualizarCriterio(
                          criterio.idLocal,
                          'nome',
                          evento.target.value,
                        )
                      }
                      minLength={2}
                      maxLength={120}
                      required
                      className="mt-2 min-h-11 w-full rounded-[10px] border border-lexis-200/20 bg-lexis-950/70 px-4 text-white outline-none focus:border-lexis-300 focus:ring-4 focus:ring-lexis-300/15"
                    />
                  </label>
                  <label className="text-sm font-semibold text-white">
                    Descrição
                    <textarea
                      value={criterio.descricao}
                      onChange={(evento) =>
                        atualizarCriterio(
                          criterio.idLocal,
                          'descricao',
                          evento.target.value,
                        )
                      }
                      minLength={5}
                      maxLength={2000}
                      rows={3}
                      required
                      className="mt-2 w-full rounded-[10px] border border-lexis-200/20 bg-lexis-950/70 px-4 py-3 text-white outline-none focus:border-lexis-300 focus:ring-4 focus:ring-lexis-300/15"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() =>
              setFormulario((atual) => ({
                ...atual,
                criterios: [
                  ...atual.criterios,
                  criarCriterioVazio(),
                ],
              }))
            }
            disabled={formulario.criterios.length >= 10}
            className="mt-5 min-h-11 rounded-[10px] bg-lexis-800 px-4 font-bold text-white disabled:opacity-45"
          >
            + Adicionar critério
          </button>
        </fieldset>

        {aviso && (
          <div
            ref={avisoRef}
            tabIndex={-1}
            role={aviso.tipo === 'erro' ? 'alert' : 'status'}
            className={`rounded-[10px] border p-4 text-sm outline-none focus:ring-4 focus:ring-lexis-300/20 ${
              aviso.tipo === 'erro'
                ? 'border-red-300/25 bg-red-950/25 text-red-100'
                : 'border-emerald-300/25 bg-emerald-950/25 text-emerald-100'
            }`}
          >
            {aviso.mensagem}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-lexis-200/10 pt-6">
          <button
            type="submit"
            disabled={status === 'salvando'}
            className="min-h-12 rounded-[10px] bg-lexis-400 px-6 font-bold text-white disabled:opacity-55"
          >
            {status === 'salvando'
              ? 'Criando tema...'
              : 'Criar tema'}
          </button>
          <Link
            to={`/professor/turmas/${turmaId}`}
            className="inline-flex min-h-12 items-center rounded-[10px] border border-lexis-200/20 px-6 font-bold text-lexis-100"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </DashboardLayout>
  )
}
