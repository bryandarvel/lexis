import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import AuthField from '../../components/auth/AuthField.jsx'
import AuthNotice from '../../components/auth/AuthNotice.jsx'
import AuthShell from '../../components/auth/AuthShell.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { interpretarErroApi } from '../../utils/api-error.js'

const dadosIniciais = {
  nome: '',
  email: '',
  senha: '',
  confirmarSenha: '',
  papel: 'ALUNO',
}

function validarFormulario(dados) {
  const erros = {}

  if (dados.nome.trim().length < 2) {
    erros.nome = 'Informe um nome com pelo menos 2 caracteres.'
  }

  if (!/^\S+@\S+\.\S+$/.test(dados.email.trim())) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (dados.senha.length < 10) {
    erros.senha = 'A senha deve possuir pelo menos 10 caracteres.'
  } else if (
    !/[a-z]/.test(dados.senha) ||
    !/[A-Z]/.test(dados.senha) ||
    !/\d/.test(dados.senha)
  ) {
    erros.senha = 'Use ao menos uma letra maiúscula, uma minúscula e um número.'
  }

  if (!dados.confirmarSenha) {
    erros.confirmarSenha = 'Confirme a senha escolhida.'
  } else if (dados.confirmarSenha !== dados.senha) {
    erros.confirmarSenha = 'As senhas informadas não coincidem.'
  }

  return erros
}

export default function CadastroPage() {
  const navigate = useNavigate()
  const { cadastrar } = useAuth()

  const [dados, setDados] = useState(dadosIniciais)
  const [errosCampos, setErrosCampos] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  function atualizarCampo(event) {
    const { name, value } = event.target

    setDados((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }))
    setErrosCampos((estadoAtual) => ({
      ...estadoAtual,
      [name]: undefined,
    }))
    setErroGeral('')
  }

  async function enviarFormulario(event) {
    event.preventDefault()

    if (enviando) {
      return
    }

    const errosValidacao = validarFormulario(dados)

    if (Object.keys(errosValidacao).length > 0) {
      setErrosCampos(errosValidacao)
      setErroGeral('Revise os campos indicados para continuar.')

      const primeiroCampo = Object.keys(
        errosValidacao,
      )[0]

      event.currentTarget.elements[
        primeiroCampo
      ]?.focus()

      return
    }

    setEnviando(true)
    setErroGeral('')
    setErrosCampos({})

    try {
      await cadastrar({
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
        papel: dados.papel,
      })

      navigate('/login', {
        replace: true,
        state: {
          cadastroConcluido: true,
          email: dados.email.trim(),
        },
      })
    } catch (error) {
      const erroInterpretado = interpretarErroApi(
        error,
        'Não foi possível criar sua conta. Tente novamente.',
      )

      setErroGeral(erroInterpretado.mensagem)
      setErrosCampos(erroInterpretado.campos)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Primeiro acesso"
      title="Crie sua conta"
      description="Escolha seu perfil e comece a usar o LÉXIS."
      footer={
        <p>
          Já possui uma conta?{' '}
          <Link
            to="/login"
            className="font-bold text-lexis-200 underline decoration-lexis-400/60 underline-offset-4 transition hover:text-lexis-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lexis-300"
          >
            Voltar para o login
          </Link>
        </p>
      }
    >
      <form
        onSubmit={enviarFormulario}
        className="space-y-5"
        noValidate
        aria-busy={enviando}
      >
        <AuthNotice mensagem={erroGeral} />

        <AuthField
          id="nome"
          name="nome"
          label="Nome completo"
          value={dados.nome}
          onChange={atualizarCampo}
          autoComplete="name"
          placeholder="Como você deseja ser chamado?"
          error={errosCampos.nome}
          required
          minLength={2}
          maxLength={120}
        />

        <AuthField
          id="email"
          name="email"
          label="E-mail"
          type="email"
          value={dados.email}
          onChange={atualizarCampo}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="voce@exemplo.com"
          error={errosCampos.email}
          required
          maxLength={191}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-lexis-100">
            Seu perfil
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['ALUNO', 'Aluno'],
              ['PROFESSOR', 'Professor'],
            ].map(([valor, rotulo]) => (
              <label
                key={valor}
                className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-bold transition focus-within:ring-4 focus-within:ring-lexis-300/15 ${
                  dados.papel === valor
                    ? 'border-lexis-300 bg-lexis-400/15 text-lexis-50'
                    : 'border-lexis-300/20 bg-lexis-950/40 text-lexis-200 hover:border-lexis-300/45'
                }`}
              >
                <input
                  type="radio"
                  name="papel"
                  value={valor}
                  checked={dados.papel === valor}
                  onChange={atualizarCampo}
                  className="sr-only"
                />
                {rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <AuthField
          id="senha"
          name="senha"
          label="Senha"
          type="password"
          value={dados.senha}
          onChange={atualizarCampo}
          autoComplete="new-password"
          placeholder="Crie uma senha segura"
          error={errosCampos.senha}
          hint="Mínimo de 10 caracteres, com letra maiúscula, minúscula e número."
          required
          minLength={10}
          maxLength={72}
        />

        <AuthField
          id="confirmarSenha"
          name="confirmarSenha"
          label="Confirme sua senha"
          type="password"
          value={dados.confirmarSenha}
          onChange={atualizarCampo}
          autoComplete="new-password"
          placeholder="Digite a senha novamente"
          error={errosCampos.confirmarSenha}
          required
          maxLength={72}
        />

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-3 rounded-[10px] bg-lexis-400 px-5 py-3.5 font-bold text-white transition hover:bg-lexis-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lexis-300/35 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {enviando && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-lexis-950/25 border-t-lexis-950 motion-reduce:animate-none"
            />
          )}
          {enviando ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
    </AuthShell>
  )
}
