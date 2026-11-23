import { startTransition, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import Aviso from '../base/Aviso.jsx'
import Botao from '../base/Botao.jsx'
import Campo from '../base/Campo.jsx'
import Dialogo from '../base/Dialogo.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import {
  atualizarMeuNome,
  excluirMinhaConta,
  solicitarTrocaMeuEmail,
  solicitarTrocaMinhaSenha,
} from '../../services/conta.js'
import { mapearErroDaConta, prepararNovoNome } from '../../utils/conta-formulario.js'
import './conta-perfil.css'

const PAPEIS = { PROFESSOR: 'Professor', ALUNO: 'Aluno' }
const ACOES = {
  nome: { titulo: 'Confirmar alteração do nome', botao: 'Confirmar novo nome' },
  email: { titulo: 'Alterar e-mail', botao: 'Enviar link de confirmação' },
  senha: { titulo: 'Redefinir senha por e-mail', botao: 'Enviar link de redefinição' },
  excluir: { titulo: 'Excluir sua conta?', botao: 'Excluir minha conta' },
}

export default function EditorConta(props) {
  const auth = useAuth()
  return <EditorDaConta key={auth.usuario?.id} {...props} {...auth} />
}

function EditorDaConta({ exibirSessao = true, membroDesde, usuario, atualizarSessao, sair, encerrarSessaoLocal }) {
  const navigate = useNavigate()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [erroNome, setErroNome] = useState('')
  const [dialogo, setDialogo] = useState(null)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [erro, setErro] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const nomeRef = useRef(null)
  const senhaRef = useRef(null)
  const emailRef = useRef(null)
  const cancelarRef = useRef(null)
  const vigente = useRef(false)
  const enviandoRef = useRef(false)
  const professor = usuario?.papel === 'PROFESSOR'
  const acao = ACOES[dialogo?.tipo]

  // A chave acima reinicia os campos na troca efetiva de conta. A limpeza
  // síncrona também invalida respostas de uma conta que já deixou a tela.
  useLayoutEffect(() => {
    vigente.current = true
    return () => { vigente.current = false }
  }, [])

  useLayoutEffect(() => {
    if (enviando) return
    if (erro?.campos?.senhaAtual) senhaRef.current?.focus()
    else if (erro?.campos?.novoEmail) emailRef.current?.focus()
  }, [enviando, erro])

  function abrir(tipo, nomeConfirmado) {
    setSenhaAtual('')
    setNovoEmail('')
    setErro(null)
    setAviso(null)
    setDialogo({ tipo, nomeConfirmado })
  }

  function fechar() {
    if (enviandoRef.current) return
    setDialogo(null)
    setSenhaAtual('')
    setNovoEmail('')
    setErro(null)
  }

  function confirmarNome(evento) {
    evento.preventDefault()
    const resultado = prepararNovoNome(nome, usuario?.nome)
    if (resultado.erro) {
      setErroNome(resultado.erro)
      nomeRef.current?.focus()
      return
    }
    abrir('nome', resultado.nome)
  }

  async function confirmar(evento) {
    evento.preventDefault()
    if (!dialogo || enviandoRef.current) return
    if (!senhaAtual) {
      setErro({ campos: { senhaAtual: 'Informe a senha atual.' } })
      return
    }

    const tipo = dialogo.tipo
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)

    try {
      let mensagem
      if (tipo === 'nome') {
        const atualizado = await atualizarMeuNome({ nome: dialogo.nomeConfirmado, senhaAtual })
        if (!vigente.current) return
        atualizarSessao({ usuario: atualizado })
        setNome(atualizado.nome)
        mensagem = 'Nome atualizado.'
      } else if (tipo === 'email') {
        const resposta = await solicitarTrocaMeuEmail({ novoEmail: novoEmail.trim(), senhaAtual })
        mensagem = resposta.mensagem
      } else if (tipo === 'senha') {
        const resposta = await solicitarTrocaMinhaSenha(senhaAtual)
        mensagem = resposta.mensagem ?? 'Solicitação registrada. Confira seu e-mail para redefinir a senha.'
      } else {
        await excluirMinhaConta(senhaAtual)
        if (!vigente.current) return
        // A navegação e a mudança de sessão precisam chegar juntas. Sem isso,
        // o RouteGuard pode redirecionar antes e perder o aviso de exclusão.
        startTransition(() => {
          navigate('/login', { replace: true, state: { contaExcluida: true } })
          encerrarSessaoLocal()
        })
        return
      }
      if (!vigente.current) return
      setAviso({ tipo, mensagem })
      enviandoRef.current = false
      fechar()
    } catch (erroApi) {
      if (!vigente.current) return
      const tratado = mapearErroDaConta(erroApi)
      const codigo = erroApi?.response?.data?.error?.code
      setErro({
        campos: tratado.campos,
        mensagem: tratado.sessaoExpirada
          ? 'Confirme sua sessão e solicite esta alteração novamente.'
          : tratado.campos.nome ?? tratado.mensagem,
        arquivar: codigo === 'ACCOUNT_HAS_ACTIVE_CLASSES',
      })
      setSenhaAtual('')
    } finally {
      enviandoRef.current = false
      if (vigente.current) setEnviando(false)
    }
  }

  async function encerrarSessao() {
    if (saindo) return
    setSaindo(true)
    try {
      await sair()
    } catch {
      // O AuthProvider encerra a sessão local mesmo sem resposta do servidor.
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="conta-formularios">
      <section className="perfil-cartao" aria-labelledby="perfil-conta">
        <h2 id="perfil-conta">Conta</h2>
        <dl className="perfil-dados">
          <div><dt>E-mail</dt><dd>{usuario?.email ?? '—'}</dd></div>
          <div><dt>Papel</dt><dd>{PAPEIS[usuario?.papel] ?? 'Não informado'}</dd></div>
          {membroDesde && <div><dt>Membro desde</dt><dd>{membroDesde}</dd></div>}
        </dl>
        <Botao type="button" variante="secundario" onClick={() => abrir('email')}>Alterar e-mail</Botao>
        <form onSubmit={confirmarNome} noValidate>
          <Campo ref={nomeRef} id="perfil-nome" label="Nome" maxLength={120} autoComplete="name"
            value={nome} error={erroNome} onChange={(evento) => {
              setNome(evento.target.value)
              setErroNome('')
              if (aviso?.tipo === 'nome') setAviso(null)
            }} />
          <Botao type="submit">Salvar nome</Botao>
        </form>
        {['nome', 'email'].includes(aviso?.tipo) && <Aviso tipo="sucesso" className="mt-4">{aviso.mensagem}</Aviso>}
      </section>

      <section className="perfil-cartao" aria-labelledby="perfil-senha-titulo">
        <h2 id="perfil-senha-titulo">Senha</h2>
        <p className="perfil-nota">Enviaremos um link ao e-mail da conta. Suas sessões só serão encerradas quando você definir a nova senha.</p>
        <Botao type="button" variante="secundario" onClick={() => abrir('senha')}>Redefinir senha por e-mail</Botao>
        {aviso?.tipo === 'senha' && <Aviso tipo="sucesso" className="mt-4">{aviso.mensagem}</Aviso>}
      </section>

      {exibirSessao && <section className="perfil-cartao" aria-labelledby="perfil-sessao">
        <h2 id="perfil-sessao">Sessão</h2>
        <p className="perfil-nota">Encerra esta sessão neste navegador.</p>
        <Botao type="button" variante="secundario" className="perfil-sair"
          carregando={saindo} rotuloCarregando="Saindo…" onClick={encerrarSessao}>Sair da conta</Botao>
      </section>}

      <section className="perfil-cartao perfil-cartao--exclusao" aria-labelledby="perfil-exclusao">
        <h2 id="perfil-exclusao">Excluir conta</h2>
        <p className="perfil-nota">Você perderá o acesso permanentemente. Redações e correções serão preservadas no histórico.</p>
        {professor && <p className="perfil-nota">Antes de excluir, arquive todas as suas turmas ativas.</p>}
        <Botao type="button" variante="perigo" onClick={() => abrir('excluir')}>Excluir minha conta</Botao>
      </section>

      <Dialogo aberto={Boolean(acao)} titulo={acao?.titulo} onFechar={fechar} ocupado={enviando}
        focoInicialRef={dialogo?.tipo === 'excluir' ? cancelarRef : dialogo?.tipo === 'email' ? emailRef : senhaRef}
        resumo={dialogo?.tipo === 'nome' ? dialogo.nomeConfirmado : undefined}
        rodapeSeparado
        rodape={<>
          <Botao ref={cancelarRef} type="button" variante="secundario" disabled={enviando} onClick={fechar}>Cancelar</Botao>
          <Botao type="submit" form="perfil-confirmar" variante={dialogo?.tipo === 'excluir' ? 'perigo' : 'primario'}
            carregando={enviando} rotuloCarregando="Aguarde…">{acao?.botao}</Botao>
        </>}>
        <form id="perfil-confirmar" className="perfil-confirmacao" onSubmit={confirmar} autoComplete="off">
          {dialogo?.tipo === 'email' && <>
            <p>O endereço atual continua válido até você confirmar a troca pelo link enviado ao novo endereço.</p>
            <Campo ref={emailRef} id="perfil-novo-email" label="Novo e-mail" type="email"
              autoComplete="email" autoCapitalize="none" maxLength={191} required value={novoEmail}
              disabled={enviando} error={erro?.campos?.novoEmail} onChange={(evento) => setNovoEmail(evento.target.value)} />
          </>}
          {dialogo?.tipo === 'senha' && <p>O link de redefinição irá para o endereço atual da conta.</p>}
          {dialogo?.tipo === 'excluir' && <ul className="perfil-efeitos">
            <li>O acesso será encerrado em todos os dispositivos. Esta ação não pode ser desfeita.</li>
            <li>Redações e correções permanecem no histórico.</li>
            {professor && <li>Todas as turmas ativas precisam estar arquivadas.</li>}
          </ul>}
          <Campo ref={senhaRef}
            id="perfil-senha-atual" label="Senha atual" type="password" autoComplete="current-password"
            value={senhaAtual} disabled={enviando} error={erro?.campos?.senhaAtual}
            onChange={(evento) => setSenhaAtual(evento.target.value)} />
          {erro?.mensagem && <Aviso tipo="erro">{erro.mensagem}</Aviso>}
          {erro?.arquivar && <Botao as={Link} variante="fantasma" to="/professor/turmas">Ver minhas turmas</Botao>}
        </form>
      </Dialogo>
    </div>
  )
}
