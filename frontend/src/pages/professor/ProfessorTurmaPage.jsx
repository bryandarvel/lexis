import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router'
import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import { listarTemasDaTurma } from '../../services/temas.js'
import {
  arquivarTurma,
  desvincularAlunoDaTurma,
  listarAlunosDaTurma,
  obterTurma,
  regenerarCodigoTurma,
  renomearTurma,
} from '../../services/turmas.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import { prepararNomeTurma } from '../../utils/professor-classes.js'
import {
  descreverSituacaoAluno,
  descreverSituacaoTurma,
  formatarDataEntrada,
  ordenarAlunosDaTurma,
  resumirAlunosDaTurma,
} from '../../utils/professor-turma.js'
import './professor-turmas.css'
import './professor-turma.css'

function formatarPrazo(valor) {
  if (!valor) {
    return 'Prazo indisponível'
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return 'Prazo indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(data)
}

function obterStatusTema(tema) {
  if (!tema.ativo) {
    return 'Arquivado'
  }

  const prazo = new Date(tema.prazoEntrega).getTime()

  if (Number.isFinite(prazo) && prazo < Date.now()) {
    return 'Prazo encerrado'
  }

  return 'Recebendo redações'
}

// Mesmo padrão do NovaTurmaDialog: dialog nativo, Esc tratado e foco devolvido
// a quem abriu.
function useDialogoModal(onClose, enviandoRef) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const focoAnterior = document.activeElement
    const dialog = dialogRef.current
    dialog.showModal()

    return () => {
      dialog.close()
      focoAnterior?.focus?.()
    }
  }, [])

  const cancelar = (event) => {
    event.preventDefault()
    if (!enviandoRef.current) onClose()
  }

  return { dialogRef, cancelar }
}

function RenomearTurmaDialog({ nomeAtual, enviando, erro, onSave, onClose }) {
  const enviandoRef = useRef(false)
  const nomeRef = useRef(null)
  const [nome, setNome] = useState(nomeAtual)
  const [erroCampo, setErroCampo] = useState('')
  const { dialogRef, cancelar } = useDialogoModal(onClose, enviandoRef)

  enviandoRef.current = enviando

  useEffect(() => {
    if (!enviando && (erro || erroCampo)) nomeRef.current?.focus()
  }, [enviando, erro, erroCampo])

  function enviar(event) {
    event.preventDefault()
    if (enviando) return
    const preparado = prepararNomeTurma(nome)
    if (preparado.erro) {
      setErroCampo(preparado.erro)
      nomeRef.current?.focus()
      return
    }
    setErroCampo('')
    onSave(preparado.nome)
  }

  return (
    <dialog ref={dialogRef} className="professor-panel-dialog class-create-dialog" aria-labelledby="turma-renomear-title" onCancel={cancelar}>
      <h2 id="turma-renomear-title">Renomear turma</h2>
      <p>O código de acesso, os alunos e os temas não mudam.</p>
      <form onSubmit={enviar} noValidate aria-busy={enviando}>
        <label htmlFor="turma-nome">Nome da turma</label>
        <input
          ref={nomeRef}
          id="turma-nome"
          className="class-input"
          value={nome}
          maxLength={100}
          autoComplete="off"
          disabled={enviando}
          required
          aria-invalid={Boolean(erroCampo)}
          aria-describedby={erroCampo ? 'turma-nome-error' : 'turma-nome-hint'}
          onChange={(event) => { setNome(event.target.value); setErroCampo('') }}
        />
        {erroCampo
          ? <p id="turma-nome-error" className="class-field-error">{erroCampo}</p>
          : <p id="turma-nome-hint">Entre 2 e 100 caracteres.</p>}
        {erro && <p className="class-field-error" role="alert">{erro}</p>}
        <div className="panel-dialog-actions">
          <button type="button" className="panel-soft-button" disabled={enviando} onClick={onClose}>Cancelar</button>
          <button type="submit" className="panel-primary-button" disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar nome'}</button>
        </div>
      </form>
    </dialog>
  )
}

function ConfirmarAcaoDialog({ titulo, efeitos, rotulo, rotuloEnviando, enviando, erro, onConfirm, onClose }) {
  const enviandoRef = useRef(false)
  const { dialogRef, cancelar } = useDialogoModal(onClose, enviandoRef)

  enviandoRef.current = enviando

  return (
    <dialog ref={dialogRef} className="professor-panel-dialog" aria-labelledby="turma-confirmar-title" aria-describedby="turma-confirmar-efeitos" onCancel={cancelar}>
      <h2 id="turma-confirmar-title">{titulo}</h2>
      <ul id="turma-confirmar-efeitos" className="turma-efeitos">
        {efeitos.map((efeito) => <li key={efeito}>{efeito}</li>)}
      </ul>
      {erro && <p className="class-field-error" role="alert">{erro}</p>}
      <div className="panel-dialog-actions">
        <button type="button" className="panel-soft-button" disabled={enviando} onClick={onClose}>Cancelar</button>
        <button type="button" className="panel-primary-button turma-botao-perigo" disabled={enviando} onClick={onConfirm}>
          {enviando ? rotuloEnviando : rotulo}
        </button>
      </div>
    </dialog>
  )
}

function TemaCard({ tema, indice }) {
  const redacoes = tema.quantidadeRedacoes ?? 0
  const criterios = tema.criterios?.length ?? 0

  return (
    <li className={`class-card class-accent-${tema.ativo ? indice % 3 : 'archived'}`}>
      <Link to={`/professor/temas/${tema.id}`} className="class-card-link" aria-label={`Abrir tema ${tema.enunciado}`}>
        <div className="class-card-info">
          <h3>{tema.enunciado}</h3>
          <p>{tema.descricao ?? 'Nenhuma descrição adicional foi cadastrada.'}</p>
          <p>
            {redacoes} {redacoes === 1 ? 'redação' : 'redações'}
            <span aria-hidden="true"> · </span>
            {criterios} {criterios === 1 ? 'critério' : 'critérios'}
            <span aria-hidden="true"> · </span>
            Prazo: {formatarPrazo(tema.prazoEntrega)}
          </p>
        </div>
        <div className="class-card-actions">
          <span className="class-badge">{obterStatusTema(tema)}</span>
          <span className="class-open" aria-hidden="true">Abrir ›</span>
        </div>
      </Link>
    </li>
  )
}

export default function ProfessorTurmaPage() {
  const { turmaId } = useParams()

  const [pagina, setPagina] = useState({ status: 'carregando', turma: null, temas: [], mensagem: '' })
  const [tentativa, setTentativa] = useState(0)
  const [alunos, setAlunos] = useState({ status: 'carregando', lista: [], mensagem: '' })
  const [dialogo, setDialogo] = useState(null)
  const [acao, setAcao] = useState({ enviando: false, erro: '' })
  const [aviso, setAviso] = useState('')
  const acaoRef = useRef(false)
  const alunosTituloRef = useRef(null)

  useEffect(() => {
    let ativo = true
    setPagina({ status: 'carregando', turma: null, temas: [], mensagem: '' })
    setAviso('')

    Promise.all([obterTurma(turmaId), listarTemasDaTurma(turmaId)])
      .then(([turma, temas]) => {
        if (ativo) setPagina({ status: 'pronto', turma, temas: Array.isArray(temas) ? temas : [], mensagem: '' })
      })
      .catch((error) => {
        if (ativo) {
          setPagina({
            status: 'erro',
            turma: null,
            temas: [],
            mensagem: interpretarErroApi(error, 'Não foi possível carregar esta turma.').mensagem,
          })
        }
      })

    return () => { ativo = false }
  }, [turmaId, tentativa])

  const turma = pagina.turma
  const situacao = descreverSituacaoTurma(turma)
  const pronto = pagina.status === 'pronto'

  const carregarAlunos = useCallback(() => {
    // O backend exige turma ativa em GET /turmas/:id/alunos: numa turma
    // arquivada a chamada responde 409, então nem é feita.
    if (!pronto || !situacao.podeGerenciar) {
      setAlunos({ status: 'indisponivel', lista: [], mensagem: '' })
      return undefined
    }

    let ativo = true
    setAlunos({ status: 'carregando', lista: [], mensagem: '' })

    listarAlunosDaTurma(turmaId)
      .then((lista) => {
        if (ativo) setAlunos({ status: 'pronto', lista: ordenarAlunosDaTurma(lista), mensagem: '' })
      })
      .catch((error) => {
        if (ativo) {
          setAlunos({
            status: 'erro',
            lista: [],
            mensagem: interpretarErroApi(error, 'Não foi possível carregar os alunos desta turma.').mensagem,
          })
        }
      })

    return () => { ativo = false }
  }, [pronto, situacao.podeGerenciar, turmaId])

  useEffect(() => carregarAlunos(), [carregarAlunos])

  function fecharDialogo() {
    if (acaoRef.current) return
    setDialogo(null)
    setAcao({ enviando: false, erro: '' })
  }

  async function executar(operacao, aoConcluir) {
    if (acaoRef.current) return
    acaoRef.current = true
    setAcao({ enviando: true, erro: '' })
    try {
      const resultado = await operacao()
      acaoRef.current = false
      setDialogo(null)
      setAcao({ enviando: false, erro: '' })
      aoConcluir(resultado)
    } catch (error) {
      acaoRef.current = false
      setAcao({
        enviando: false,
        erro: interpretarErroApi(error, 'Não foi possível concluir. Tente novamente.').mensagem,
      })
    }
  }

  function renomear(nome) {
    executar(() => renomearTurma(turmaId, nome), (atualizada) => {
      setPagina((atual) => ({ ...atual, turma: atualizada }))
      setAviso(`Turma renomeada para “${atualizada.nome}”.`)
    })
  }

  function regenerar() {
    executar(() => regenerarCodigoTurma(turmaId), (atualizada) => {
      setPagina((atual) => ({ ...atual, turma: atualizada }))
      setAviso(`Novo código de acesso: ${atualizada.codigoAcesso}. O código anterior deixou de funcionar.`)
    })
  }

  function arquivar() {
    executar(() => arquivarTurma(turmaId), (atualizada) => {
      setPagina((atual) => ({ ...atual, turma: atualizada }))
      setAlunos({ status: 'indisponivel', lista: [], mensagem: '' })
      setAviso('Turma arquivada. As matrículas ativas foram encerradas.')
    })
  }

  function desvincular(matricula) {
    const nome = matricula.aluno?.nome ?? 'O aluno'
    executar(() => desvincularAlunoDaTurma(turmaId, matricula.aluno.id), () => {
      setAlunos((atual) => ({
        ...atual,
        lista: atual.lista.filter((item) => item.id !== matricula.id),
      }))
      setPagina((atual) => (atual.turma
        ? { ...atual, turma: { ...atual.turma, quantidadeAlunosAtivos: Math.max(0, (atual.turma.quantidadeAlunosAtivos ?? 1) - 1) } }
        : atual))
      setAviso(`${nome} foi desvinculado da turma.`)
      requestAnimationFrame(() => alunosTituloRef.current?.focus())
    })
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(turma.codigoAcesso)
      setAviso(`Código ${turma.codigoAcesso} copiado.`)
    } catch {
      setAviso(`Não foi possível copiar automaticamente. O código é ${turma.codigoAcesso}.`)
    }
  }

  const resumo = resumirAlunosDaTurma(alunos.lista)

  return (
    <ProfessorWorkspaceLayout secao="Turmas" turmas={pronto ? [turma] : []} pronto={pronto}>
      <motion.main
        id="panel-main"
        tabIndex={-1}
        className="panel-main turma-main"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .22 }}
        aria-busy={pagina.status === 'carregando'}
      >
        <Link to="/professor/turmas" className="panel-soft-button turma-back">
          <span aria-hidden="true">←</span>&nbsp;Voltar às turmas
        </Link>

        {pagina.status === 'carregando' && (
          <>
            <h1>Turma</h1>
            <p role="status" className="panel-subtitle">Carregando a turma…</p>
            <div className="panel-stats turma-stats" aria-hidden="true">
              {[0, 1, 2].map((item) => <div key={item} className="panel-stat skeleton-block" />)}
            </div>
            <ul className="classes-grid" aria-hidden="true">
              {[0, 1, 2].map((item) => <li key={item} className="class-card skeleton-block" />)}
            </ul>
          </>
        )}

        {pagina.status === 'erro' && (
          <>
            <h1>Turma</h1>
            <section className="panel-error" role="alert">
              <h2>Não foi possível abrir a turma</h2>
              <p>{pagina.mensagem}</p>
              <div className="turma-acoes">
                <button type="button" className="panel-primary-button" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
                <Link className="panel-soft-button" to="/professor/turmas">Voltar às turmas</Link>
              </div>
            </section>
          </>
        )}

        {pronto && (
          <>
            <p className="turma-eyebrow">Visão da turma</p>
            <div className="turma-heading">
              <div>
                <h1>{turma.nome}</h1>
                <p className="panel-subtitle">
                  Organize temas, acompanhe as entregas e gerencie os participantes desta turma.
                </p>
              </div>
              {situacao.ativa && (
                <Link to={`/professor/turmas/${turmaId}/temas/novo`} className="panel-primary-button turma-create">
                  Criar tema de redação
                </Link>
              )}
            </div>

            <p role="status" className="turma-aviso">{aviso}</p>

            <dl className="panel-stats turma-stats" aria-label="Indicadores da turma">
              <div className="panel-stat">
                <dt>Código de acesso</dt>
                <dd>
                  <span className="turma-codigo">{turma.codigoAcesso}</span>
                  <button type="button" className="panel-soft-button turma-copiar" onClick={copiarCodigo}>
                    Copiar
                  </button>
                </dd>
              </div>
              <div className="panel-stat">
                <dt>Alunos ativos</dt>
                <dd>{turma.quantidadeAlunosAtivos ?? 0}</dd>
              </div>
              <div className="panel-stat">
                <dt>Situação</dt>
                <dd>{situacao.rotulo}</dd>
              </div>
            </dl>

            <section className="panel-attention turma-gestao" aria-labelledby="turma-gestao-title">
              <h2 id="turma-gestao-title">Gestão da turma</h2>
              {situacao.podeGerenciar ? (
                <>
                  <p>Renomear a turma, gerar um novo código de acesso ou arquivar a turma.</p>
                  <div className="turma-acoes">
                    <button type="button" className="panel-soft-button" onClick={() => setDialogo({ tipo: 'renomear' })}>Renomear turma</button>
                    <button type="button" className="panel-soft-button" onClick={() => setDialogo({ tipo: 'regenerar' })}>Gerar novo código</button>
                    <button type="button" className="panel-soft-button turma-botao-perigo" onClick={() => setDialogo({ tipo: 'arquivar' })}>Arquivar turma</button>
                  </div>
                </>
              ) : (
                <p>
                  Esta turma está arquivada desde {formatarDataEntrada(turma.arquivadaEm)}. As matrículas
                  foram encerradas e a turma não pode mais ser alterada. As redações e as correções
                  continuam disponíveis.
                </p>
              )}
            </section>

            <section className="panel-attention turma-alunos" aria-labelledby="turma-alunos-title">
              <h2 id="turma-alunos-title" ref={alunosTituloRef} tabIndex={-1}>Alunos da turma</h2>
              <p>
                {alunos.status === 'pronto'
                  ? `${resumo.rotulo}${resumo.desativados ? ` · ${resumo.desativados} com conta desativada` : ''}`
                  : 'Alunos com matrícula ativa nesta turma.'}
              </p>

              {alunos.status === 'carregando' && (
                <ul className="turma-alunos-lista" role="status" aria-label="Carregando alunos">
                  {[0, 1, 2].map((item) => <li key={item} className="turma-aluno skeleton-block" aria-hidden="true" />)}
                </ul>
              )}

              {alunos.status === 'erro' && (
                <div className="panel-error" role="alert">
                  <h3>Não foi possível carregar os alunos</h3>
                  <p>{alunos.mensagem}</p>
                  <button type="button" className="panel-primary-button" onClick={carregarAlunos}>Tentar novamente</button>
                </div>
              )}

              {alunos.status === 'indisponivel' && (
                <div className="panel-empty">
                  <h3>Lista indisponível em turma arquivada</h3>
                  <p>As matrículas foram encerradas no arquivamento.</p>
                </div>
              )}

              {alunos.status === 'pronto' && (alunos.lista.length ? (
                <ul className="turma-alunos-lista">
                  {alunos.lista.map((matricula) => {
                    const estado = descreverSituacaoAluno(matricula)
                    return (
                      <li key={matricula.id} className="turma-aluno">
                        <div className="turma-aluno-info">
                          <strong>{matricula.aluno?.nome ?? 'Aluno'}</strong>
                          <span>{matricula.aluno?.email}</span>
                          <span>
                            Entrou em {formatarDataEntrada(matricula.iniciadaEm)}
                            <span aria-hidden="true"> · </span>
                            <span className={estado.atencao ? 'attention' : undefined}>{estado.rotulo}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          className="panel-soft-button turma-botao-perigo"
                          onClick={() => setDialogo({ tipo: 'desvincular', matricula })}
                          aria-label={`Desvincular ${matricula.aluno?.nome ?? 'aluno'} da turma`}
                        >
                          Desvincular
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="panel-empty">
                  <h3>Nenhum aluno nesta turma</h3>
                  <p>Compartilhe o código <strong>{turma.codigoAcesso}</strong> para os alunos entrarem.</p>
                </div>
              ))}
            </section>

            <section className="panel-attention turma-temas" aria-labelledby="turma-temas-title">
              <h2 id="turma-temas-title">Temas da turma</h2>
              <p>Acompanhe os prazos e a quantidade de redações recebidas em cada proposta.</p>
              {pagina.temas.length ? (
                <ul className="classes-grid">
                  {pagina.temas.map((tema, indice) => <TemaCard key={tema.id} tema={tema} indice={indice} />)}
                </ul>
              ) : (
                <div className="panel-empty">
                  <h3>Esta turma ainda não possui temas de redação.</h3>
                </div>
              )}
            </section>

            {dialogo?.tipo === 'renomear' && (
              <RenomearTurmaDialog
                nomeAtual={turma.nome}
                enviando={acao.enviando}
                erro={acao.erro}
                onSave={renomear}
                onClose={fecharDialogo}
              />
            )}

            {dialogo?.tipo === 'regenerar' && (
              <ConfirmarAcaoDialog
                titulo="Gerar um novo código de acesso?"
                efeitos={[
                  'O código atual deixa de funcionar imediatamente.',
                  'Quem já está matriculado continua na turma.',
                  'Alunos que ainda não entraram precisarão do código novo.',
                ]}
                rotulo="Gerar novo código"
                rotuloEnviando="Gerando..."
                enviando={acao.enviando}
                erro={acao.erro}
                onConfirm={regenerar}
                onClose={fecharDialogo}
              />
            )}

            {dialogo?.tipo === 'arquivar' && (
              <ConfirmarAcaoDialog
                titulo={`Arquivar a turma “${turma.nome}”?`}
                efeitos={[
                  'As matrículas de todos os alunos são encerradas.',
                  'Os alunos deixam de ver as propostas desta turma e não podem enviar redações.',
                  'As redações e as correções já publicadas continuam disponíveis.',
                  'A turma continua na sua lista, marcada como arquivada, e não poderá mais ser alterada nem reaberta pela interface.',
                ]}
                rotulo="Arquivar turma"
                rotuloEnviando="Arquivando..."
                enviando={acao.enviando}
                erro={acao.erro}
                onConfirm={arquivar}
                onClose={fecharDialogo}
              />
            )}

            {dialogo?.tipo === 'desvincular' && (
              <ConfirmarAcaoDialog
                titulo={`Desvincular ${dialogo.matricula.aluno?.nome ?? 'o aluno'} da turma?`}
                efeitos={[
                  'A matrícula é encerrada e o aluno deixa de ver as propostas desta turma.',
                  'As redações já enviadas e as correções publicadas permanecem.',
                  'O aluno não recebe aviso automático: combine a saída com ele.',
                  'Ele pode voltar depois com o código de acesso ou entrar em outra turma.',
                ]}
                rotulo="Desvincular aluno"
                rotuloEnviando="Desvinculando..."
                enviando={acao.enviando}
                erro={acao.erro}
                onConfirm={() => desvincular(dialogo.matricula)}
                onClose={fecharDialogo}
              />
            )}
          </>
        )}
      </motion.main>
    </ProfessorWorkspaceLayout>
  )
}
