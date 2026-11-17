import Botao from '../../components/base/Botao.jsx'
import Campo from '../../components/base/Campo.jsx'
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

import AppShell from '../../layouts/AppShell.jsx'
import {
  criarTema,
  obterModeloCompetenciaDois,
} from '../../services/temas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import {
  criarCriterioVazio,
  criarCriteriosDoModelo,
  prepararTemaParaEnvio,
  validarCriteriosNovaProposta,
  validarFormularioTema,
} from '../../utils/topic-form.js'

const TRILHA = [
  { rotulo: 'Turmas', para: '/professor/turmas' },
  'Nova proposta',
]

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

  function removerCriterio(idLocal) {
    setFormulario((atual) => ({
      ...atual,
      criterios: [
        ...atual.criterios.slice(0, 3),
        ...atual.criterios.slice(3).filter((criterio) => criterio.idLocal !== idLocal),
      ],
    }))
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    const erroValidacao =
      validarFormularioTema(formulario) ??
      validarCriteriosNovaProposta(formulario.criterios, modelo)

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
      <AppShell conteudo="livre" trilha={TRILHA}>
        <div
          className="mx-auto max-w-5xl px-6 py-16"
          role="status"
        >
          <div className="h-10 w-72 animate-pulse rounded-cartao bg-acao-suave" />
          <div className="mt-8 h-[34rem] animate-pulse rounded-cartao bg-acao-suave" />
          <span className="sr-only">
            Carregando modelo de critérios…
          </span>
        </div>
      </AppShell>
    )
  }

  if (status === 'erro') {
    return (
      <AppShell conteudo="livre" trilha={TRILHA}>
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Link
            to={`/professor/turmas/${turmaId}`}
            className="text-sm font-semibold text-acao-texto hover:text-texto"
          >
            ← Voltar à turma
          </Link>
          <div
            role="alert"
            className="mt-8 rounded-cartao border border-red-300/25 bg-red-950/25 p-6 text-red-100"
          >
            {aviso?.mensagem}
          </div>
          <Botao
            type="button"
            onClick={() => setTentativa((valor) => valor + 1)}
            className="mt-5"
          >
            Tentar novamente
          </Botao>
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell conteudo="livre" trilha={TRILHA}>
      <header className="border-b border-borda px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <Link
            to={`/professor/turmas/${turmaId}`}
            className="text-sm font-semibold text-acao-texto hover:text-texto"
          >
            ← Voltar à turma
          </Link>
          <h1 className="mt-3 text-4xl font-semibold text-texto sm:text-5xl">
            Nova proposta de redação
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-texto-suave">
            A análise do repertório usa três critérios fixos: Legitimação, Pertinência e Uso produtivo. Você pode adicionar até dois critérios personalizados. Eles orientam a IA e não têm peso na nota.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl space-y-7 px-6 py-10 sm:px-10"
        aria-busy={status === 'salvando'}
      >
        <section className="surface-card rounded-cartao p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-texto">
            Proposta
          </h2>
          <div className="mt-6 grid gap-6">
            <Campo
              label="Título da proposta"
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
            />

            <Campo
              label="Comando da redação" multilinha
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
            />

            <Campo
              label="Instruções adicionais (opcional)" multilinha
              value={formulario.instrucoes}
              onChange={(evento) =>
                atualizarCampo(
                  'instrucoes',
                  evento.target.value,
                )
              }
              maxLength={5000}
              rows={3}
            />

            <div className="max-w-sm">
              <Campo
                label="Prazo de entrega"
                type="datetime-local"
                value={formulario.prazoEntrega}
                onChange={(evento) =>
                  atualizarCampo(
                    'prazoEntrega',
                    evento.target.value,
                  )
                }
                required
              />
            </div>
          </div>
        </section>

        <fieldset className="surface-card rounded-cartao p-5 sm:p-7">
          <legend className="px-2 text-xl font-semibold text-texto">
            Critérios de avaliação
          </legend>
          <p className="max-w-2xl text-sm leading-6 text-texto-suave">
            Base fixa da Competência II. Os critérios personalizados aparecem depois da base na análise e na correção do professor.
          </p>

          <ol className="mt-5 divide-y divide-borda">
            {formulario.criterios.map((criterio, indice) => (
              <li
                key={criterio.idLocal}
                className="py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-texto">
                    {indice < 3 ? `${criterio.nome} · fixo` : `Critério personalizado ${indice - 2}`}
                  </h3>
                  {indice >= 3 && <button
                      type="button"
                      onClick={() =>
                        removerCriterio(criterio.idLocal)
                      }
                      aria-label={`Remover critério ${indice + 1}`}
                      className="min-h-10 rounded-controle border border-red-300/25 px-3 text-sm text-red-200 disabled:opacity-40"
                    >
                      Remover
                    </button>}
                </div>

                {indice < 3 ? <p className="mt-1 text-sm leading-6 text-texto-suave">{criterio.descricao}</p> : <div className="mt-3 grid gap-4">
                  <Campo
                    label="Nome"
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
                  />
                  <Campo
                    label="Descrição" multilinha
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
                  />
                </div>}
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
            disabled={formulario.criterios.length >= 5}
            className="mt-5 min-h-11 rounded-cartao bg-superficie-rebaixada px-4 font-bold text-texto disabled:opacity-45"
          >
            + Adicionar critério personalizado
          </button>
          <p className="mt-3 text-sm text-texto-suave">Até dois personalizados.</p>
        </fieldset>

        {aviso && (
          <div
            ref={avisoRef}
            tabIndex={-1}
            role={aviso.tipo === 'erro' ? 'alert' : 'status'}
            className={`rounded-cartao border p-4 text-sm outline-none focus:ring-4 focus:ring-foco/20 ${
              aviso.tipo === 'erro'
                ? 'border-red-300/25 bg-red-950/25 text-red-100'
                : 'border-emerald-300/25 bg-emerald-950/25 text-emerald-100'
            }`}
          >
            {aviso.mensagem}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-borda pt-6">
          <Botao
            type="submit"
            disabled={status === 'salvando'}
            
          >
            {status === 'salvando'
              ? 'Criando tema…'
              : 'Criar proposta'}
          </Botao>
          <Link
            to={`/professor/turmas/${turmaId}`}
            className="inline-flex min-h-12 items-center rounded-cartao border border-borda px-6 font-bold text-texto"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AppShell>
  )
}
