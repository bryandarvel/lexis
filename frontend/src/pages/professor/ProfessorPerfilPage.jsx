import { useEffect, useRef, useState } from 'react'
import Botao from '../../components/base/Botao.jsx'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'

import Campo from '../../components/base/Campo.jsx'
import ProfessorWorkspaceLayout from '../../layouts/ProfessorWorkspaceLayout.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import {
  alterarMinhaSenha,
  atualizarMeuNome,
} from '../../services/conta.js'
import {
  mapearErroDaConta,
  prepararNovoNome,
  prepararTrocaDeSenha,
  reiniciarCamposDaConta,
  respostaAindaVale,
  SENHA_VAZIA,
} from '../../utils/conta-formulario.js'
import { REGRA_SENHA } from '../../utils/senha.js'
import './professor-perfil.css'

const PAPEIS = {
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
}

export default function ProfessorPerfilPage() {
  const { usuario, atualizarSessao, sair } = useAuth()
  const navigate = useNavigate()
  const [saindo, setSaindo] = useState(false)
  const nomeRef = useRef(null)
  const senhaAtualRef = useRef(null)
  const novaSenhaRef = useRef(null)

  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [nomeEstado, setNomeEstado] = useState({
    enviando: false,
    erro: '',
    mensagem: '',
    sucesso: '',
  })

  const [senha, setSenha] = useState(SENHA_VAZIA)
  const [senhaEstado, setSenhaEstado] = useState({
    enviando: false,
    erros: {},
    mensagem: '',
    sucesso: '',
  })

  // Conta dona do que está nos campos. Quando entra outra pessoa pela
  // reautenticação, o formulário é reiniciado ainda neste render, antes de a
  // tela aparecer para ela. Reautenticar na mesma conta não mexe em nada.
  const [contaDoFormulario, setContaDoFormulario] = useState(usuario?.id)
  const reinicio = reiniciarCamposDaConta({
    contaDoFormulario,
    usuario,
    nome,
    senha,
  })

  if (reinicio.trocou) {
    setContaDoFormulario(usuario?.id)
    setNome(reinicio.nome)
    setSenha(reinicio.senha)
    setNomeEstado({ enviando: false, erro: '', mensagem: '', sucesso: '' })
    setSenhaEstado({ enviando: false, erros: {}, mensagem: '', sucesso: '' })
  }

  // Lido no momento da resposta: diz de quem é a sessão agora.
  const contaAtual = useRef(usuario?.id)
  contaAtual.current = usuario?.id

  // O nome pode mudar por outra via (a própria troca de senha devolve o
  // usuário); o campo acompanha enquanto não está sendo editado.
  useEffect(() => {
    if (!nomeEstado.enviando) {
      setNome((atual) => (atual === '' ? usuario?.nome ?? '' : atual))
    }
  }, [usuario?.nome, nomeEstado.enviando])

  // Depois do render: durante o envio o campo está desabilitado, e focar antes
  // do commit deixaria o foco no body.
  useEffect(() => {
    if (senhaEstado.sucesso) {
      senhaAtualRef.current?.focus()
    }
  }, [senhaEstado.sucesso])

  async function encerrarSessao() {
    if (saindo) return

    setSaindo(true)

    try {
      await sair()
    } catch {
      // O AuthProvider limpa a sessão local mesmo sem resposta do servidor.
    }

    navigate('/login', { replace: true })
  }

  async function salvarNome(evento) {
    evento.preventDefault()

    if (nomeEstado.enviando) return

    // Conta que pediu a alteração: a resposta não pode mexer na sessão de
    // quem entrar depois.
    const contaDaAcao = usuario?.id
    const { nome: nomeValido, erro } = prepararNovoNome(nome, usuario?.nome)

    if (!nomeValido) {
      setNomeEstado({ enviando: false, erro, mensagem: '', sucesso: '' })
      nomeRef.current?.focus()
      return
    }

    setNomeEstado({ enviando: true, erro: '', mensagem: '', sucesso: '' })

    try {
      const atualizado = await atualizarMeuNome(nomeValido)

      if (!respostaAindaVale(contaDaAcao, contaAtual.current)) return

      atualizarSessao({ usuario: atualizado })
      setNome(atualizado.nome)
      setNomeEstado({
        enviando: false,
        erro: '',
        mensagem: '',
        sucesso: 'Nome atualizado.',
      })
    } catch (erroApi) {
      if (!respostaAindaVale(contaDaAcao, contaAtual.current)) return

      const tratado = mapearErroDaConta(erroApi)

      setNomeEstado({
        enviando: false,
        erro: tratado.campos.nome ?? '',
        // 401 fica com o interceptor, que abre a reautenticação.
        mensagem: tratado.sessaoExpirada ? '' : tratado.mensagem,
        sucesso: '',
      })

      if (tratado.campos.nome) nomeRef.current?.focus()
    }
  }

  async function trocarSenha(evento) {
    evento.preventDefault()

    if (senhaEstado.enviando) return

    const contaDaAcao = usuario?.id
    const { dados, erros } = prepararTrocaDeSenha(senha)

    if (!dados) {
      setSenhaEstado({ enviando: false, erros, mensagem: '', sucesso: '' })

      if (erros.senhaAtual) senhaAtualRef.current?.focus()
      else novaSenhaRef.current?.focus()

      return
    }

    setSenhaEstado({ enviando: true, erros: {}, mensagem: '', sucesso: '' })

    try {
      const sessao = await alterarMinhaSenha(dados)

      if (!respostaAindaVale(contaDaAcao, contaAtual.current)) return

      // O token novo entra na hora: a sessão atual continua valendo.
      atualizarSessao({
        usuario: sessao.usuario,
        accessToken: sessao.accessToken,
      })
      setSenha(SENHA_VAZIA)
      setSenhaEstado({
        enviando: false,
        erros: {},
        mensagem: '',
        sucesso:
          'Senha alterada. Você continua conectado; as outras sessões foram encerradas.',
      })
    } catch (erroApi) {
      if (!respostaAindaVale(contaDaAcao, contaAtual.current)) return

      const tratado = mapearErroDaConta(erroApi)

      setSenhaEstado({
        enviando: false,
        erros: tratado.campos,
        mensagem: tratado.sessaoExpirada ? '' : tratado.mensagem,
        sucesso: '',
      })

      if (tratado.campos.senhaAtual) senhaAtualRef.current?.focus()
      else if (tratado.campos.novaSenha) novaSenhaRef.current?.focus()
    }
  }

  const campoSenha = (chave) => ({
    type: 'password',
    autoComplete:
      chave === 'senhaAtual' ? 'current-password' : 'new-password',
    value: senha[chave],
    disabled: senhaEstado.enviando,
    onChange: (evento) =>
      setSenha((atual) => ({ ...atual, [chave]: evento.target.value })),
  })

  return (
    <ProfessorWorkspaceLayout secao="Perfil">
      <motion.main
        id="panel-main"
        tabIndex={-1}
        className="panel-main perfil-main"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <h1>Perfil</h1>
        <p className="panel-subtitle">
          Seus dados de conta e a troca de senha.
        </p>

        <section className="perfil-cartao" aria-labelledby="perfil-conta">
          <h2 id="perfil-conta">Conta</h2>
          <dl className="perfil-dados">
            <div>
              <dt>Nome</dt>
              <dd>{usuario?.nome ?? '—'}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{usuario?.email ?? '—'}</dd>
            </div>
            <div>
              <dt>Papel</dt>
              <dd>{PAPEIS[usuario?.papel] ?? 'Não informado'}</dd>
            </div>
          </dl>
          <p className="perfil-nota">
            O e-mail não pode ser alterado por aqui.
          </p>
        </section>

        <section className="perfil-cartao" aria-labelledby="perfil-nome-titulo">
          <h2 id="perfil-nome-titulo">Editar nome</h2>

          <form onSubmit={salvarNome} noValidate>
            <Campo
              ref={nomeRef}
              id="perfil-nome"
              label="Nome"
              type="text"
              maxLength={120}
              autoComplete="name"
              value={nome}
              disabled={nomeEstado.enviando}
              error={nomeEstado.erro}
              onChange={(evento) => setNome(evento.target.value)}
            />

            {nomeEstado.mensagem && (
              <p className="perfil-erro" role="alert">
                {nomeEstado.mensagem}
              </p>
            )}
            {nomeEstado.sucesso && (
              <p className="perfil-sucesso" role="status">
                {nomeEstado.sucesso}
              </p>
            )}

            <Botao
              type="submit"
             
              disabled={nomeEstado.enviando}
            >
              {nomeEstado.enviando ? 'Salvando...' : 'Salvar nome'}
            </Botao>
          </form>
        </section>

        <section className="perfil-cartao" aria-labelledby="perfil-senha-titulo">
          <h2 id="perfil-senha-titulo">Trocar senha</h2>
          <p className="perfil-nota">
            {REGRA_SENHA}{' '}
            As outras sessões são encerradas; esta continua aberta.
          </p>

          <form onSubmit={trocarSenha} noValidate>
            <Campo
              ref={senhaAtualRef}
              id="perfil-senhaAtual"
              label="Senha atual"
              {...campoSenha('senhaAtual')}
              error={senhaEstado.erros.senhaAtual}
            />

            <Campo
              ref={novaSenhaRef}
              id="perfil-novaSenha"
              label="Nova senha"
              {...campoSenha('novaSenha')}
              error={senhaEstado.erros.novaSenha}
            />

            <Campo
              id="perfil-confirmacao"
              label="Confirme a nova senha"
              {...campoSenha('confirmacao')}
              error={senhaEstado.erros.confirmacao}
            />

            {senhaEstado.mensagem && (
              <p className="perfil-erro" role="alert">
                {senhaEstado.mensagem}
              </p>
            )}
            {senhaEstado.sucesso && (
              <p className="perfil-sucesso" role="status">
                {senhaEstado.sucesso}
              </p>
            )}

            <Botao
              type="submit"
             
              disabled={senhaEstado.enviando}
            >
              {senhaEstado.enviando ? 'Alterando...' : 'Alterar senha'}
            </Botao>
          </form>
        </section>

        {/* O diálogo do painel deixou de abrir o perfil, então a saída da
            conta passa a viver aqui, que é o único caminho restante. */}
        <section className="perfil-cartao" aria-labelledby="perfil-sessao">
          <h2 id="perfil-sessao">Sessão</h2>
          <p className="perfil-nota">
            Encerra esta sessão neste navegador.
          </p>
          <Botao
            type="button"
            variante="secundario" className="perfil-sair"
            disabled={saindo}
            onClick={encerrarSessao}
          >
            {saindo ? 'Saindo...' : 'Sair da conta'}
          </Botao>
        </section>
      </motion.main>
    </ProfessorWorkspaceLayout>
  )
}
