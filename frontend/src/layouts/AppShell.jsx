import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'

import MinhaTurmaDialogo from '../components/aluno/MinhaTurmaDialogo.jsx'
import {
  IconeDaNavegacao,
  IconeMenu,
} from '../components/layout/icones-casca.jsx'
import MenuUsuario from '../components/layout/MenuUsuario.jsx'
import Sino from '../components/layout/Sino.jsx'
import ThemeToggle from '../components/layout/ThemeToggle.jsx'
import Trilha from '../components/layout/Trilha.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useNotificacoesNaoLidas } from '../hooks/useNotificacoesNaoLidas.js'
import {
  listarNotificacoesProfessor,
  marcarNotificacaoProfessorLida,
} from '../services/notificacoes-professor.js'
import {
  listarNotificacoes,
  marcarNotificacaoLida,
} from '../services/notificacoes.js'
import { mensagemSaidaDaTurma } from '../utils/minha-turma.js'
import {
  montarNavegacao,
  rotaInicialDoPapel,
} from '../utils/navegacao-casca.js'
import { descreverAvisoProfessor } from '../utils/notificacoes-professor.js'
import { descreverAcaoNotificacao } from '../utils/notifications.js'
import './app-shell.css'
import './escopo-aluno.css'
import '../pages/professor/professor-dashboard.css'

const ID_CONTEUDO = 'conteudo-principal'
const ID_NAVEGACAO = 'casca-navegacao'
const CONSULTA_TELA_LARGA = '(min-width: 1024px)'

/*
 * O que muda por papel na casca. `escopo` é a classe que guarda as variáveis
 * próprias das telas de cada papel (--aluno-* e --panel-*): elas continuam
 * existindo até a reorganização das telas (docs/mapa-tokens.md) e não trazem
 * nenhuma regra de casca.
 */
const PAPEIS = {
  ALUNO: {
    escopo: 'aluno-shell',
    nomePadrao: 'Aluno',
    rotuloNavegacao: 'Navegação do aluno',
    rotaNotificacoes: '/aluno/notificacoes',
    rotaPerfil: '/aluno/perfil',
    listarAvisos: listarNotificacoes,
    marcarAvisoLido: marcarNotificacaoLida,
    descreverAviso: descreverAcaoNotificacao,
    textoSemAvisos:
      'Quando um professor publicar uma correção, o aviso aparece aqui.',
  },
  PROFESSOR: {
    escopo: 'professor-panel',
    nomePadrao: 'Professor',
    rotuloNavegacao: 'Navegação do professor',
    rotaNotificacoes: '/professor/notificacoes',
    rotaPerfil: '/professor/perfil',
    listarAvisos: listarNotificacoesProfessor,
    marcarAvisoLido: marcarNotificacaoProfessorLida,
    descreverAviso: descreverAvisoProfessor,
    textoSemAvisos:
      'Quando um aluno enviar uma redação, o aviso aparece aqui.',
  },
}

const CLASSES_DE_CONTEUDO = {
  coluna: 'casca-margem casca-margem--coluna',
  amplo: 'casca-margem',
  livre: '',
}

function ItemDeNavegacao({ item, onNavegar }) {
  /*
   * Issue #188: o ícone ganha uma moldura arredondada própria, que é o que
   * marca o item atual. O <span> existe para a moldura ter caixa própria: dar
   * fundo e respiro ao <svg> direto depende de como o viewBox escala dentro do
   * padding, e quebra com ícones de proporções diferentes.
   */
  const conteudo = (
    <>
      <span aria-hidden="true" className="casca-item-icone">
        <IconeDaNavegacao chave={item.chave} />
      </span>
      {item.rotulo}
    </>
  )

  if (item.tipo === 'indisponivel') {
    return (
      <span
        role="link"
        aria-disabled="true"
        tabIndex={0}
        className="casca-item"
      >
        {conteudo}
        <span className="sr-only"> ({item.motivo})</span>
      </span>
    )
  }

  return (
    <Link
      to={item.para}
      aria-current={item.atual ? 'page' : undefined}
      onClick={onNavegar}
      className="casca-item"
    >
      {conteudo}
    </Link>
  )
}

/*
 * Casca única das telas autenticadas (Lote 4, UX-001): barra, menu lateral e
 * área de conteúdo iguais para aluno e professor. O papel vem da sessão e só
 * decide os itens de navegação e os destinos do sino e do perfil.
 *
 * - `trilha`: texto ou { rotulo, para }; o último item é a página atual.
 * - `conteudo`: "coluna" (margem e largura máxima de leitura), "amplo" (só a
 *   margem) ou "livre" (a tela cuida do próprio espaçamento).
 * - `imersivo`: sem menu lateral, para a correção.
 * - `indicador`: nó extra na barra, antes do sino.
 * - `rotaEnviarRedacao` (aluno) alimenta o único item de navegação que
 *   depende dos dados da tela.
 */
export default function AppShell({
  trilha = [],
  conteudo = 'coluna',
  imersivo = false,
  indicador = null,
  rotaEnviarRedacao = null,
  children,
}) {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const papel = usuario?.papel === 'PROFESSOR' ? 'PROFESSOR' : 'ALUNO'
  const dadosDoPapel = PAPEIS[papel]
  // A contagem é da conta que a carregou: na troca de pessoa pela reautenticação ela some e é
  // consultada de novo; na mesma conta, é preservada.
  const totalNaoLidas = useNotificacoesNaoLidas({
    habilitado: Boolean(usuario),
    listar: dadosDoPapel.listarAvisos,
    usuarioId: usuario?.id,
  })
  const [saindo, setSaindo] = useState(false)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const [minhaTurmaAberta, setMinhaTurmaAberta] = useState(false)
  const botaoGavetaRef = useRef(null)
  const navegacaoRef = useRef(null)
  const botaoAvatarRef = useRef(null)

  const itens = montarNavegacao({
    papel,
    caminho: pathname,
    rotaEnviarRedacao,
  })

  // A gaveta só existe abaixo de 1024 px. Enquanto está aberta, o resto da
  // página fica inerte (UX-025): o Tab circula entre o botão que a fecha e os
  // itens do menu. Escape fecha e devolve o foco ao botão.
  useEffect(() => {
    if (!gavetaAberta) return undefined

    navegacaoRef.current
      ?.querySelector('a, button:not(:disabled), [tabindex="0"]')
      ?.focus()

    function fecharComEscape(evento) {
      if (evento.key === 'Escape') {
        setGavetaAberta(false)
        botaoGavetaRef.current?.focus()
      }
    }

    const telaLarga = globalThis.matchMedia?.(CONSULTA_TELA_LARGA)

    // Ao alargar a janela o menu volta a ser fixo: a gaveta não pode ficar
    // "aberta" deixando o conteúdo inerte.
    function fecharAoAlargar(evento) {
      if (evento.matches) setGavetaAberta(false)
    }

    document.addEventListener('keydown', fecharComEscape)
    telaLarga?.addEventListener('change', fecharAoAlargar)

    return () => {
      document.removeEventListener('keydown', fecharComEscape)
      telaLarga?.removeEventListener('change', fecharAoAlargar)
    }
  }, [gavetaAberta])

  function fecharGaveta() {
    setGavetaAberta(false)
  }

  function concluirSaidaDaTurma(turma) {
    setMinhaTurmaAberta(false)
    navigate('/aluno', {
      state: { aviso: mensagemSaidaDaTurma(turma) },
    })
  }

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

  const classeConteudo =
    CLASSES_DE_CONTEUDO[imersivo ? 'livre' : conteudo] ??
    CLASSES_DE_CONTEUDO.coluna

  return (
    <div
      className={`casca ${dadosDoPapel.escopo}${imersivo ? ' casca--imersiva' : ''}`}
    >
      <a
        href={`#${ID_CONTEUDO}`}
        inert={gavetaAberta}
        className="casca-pular"
      >
        Pular para o conteúdo
      </a>

      <header className="casca-barra">
        {!imersivo && (
          <button
            ref={botaoGavetaRef}
            type="button"
            aria-expanded={gavetaAberta}
            aria-controls={ID_NAVEGACAO}
            aria-label={
              gavetaAberta
                ? 'Fechar menu de navegação'
                : 'Abrir menu de navegação'
            }
            onClick={() => setGavetaAberta((atual) => !atual)}
            className="casca-botao-gaveta"
          >
            <IconeMenu />
          </button>
        )}

        <div className="casca-barra-resto" inert={gavetaAberta}>
          <Link
            to={rotaInicialDoPapel(papel)}
            className="brand-wordmark casca-marca"
          >
            LÉXIS
          </Link>

          <Trilha itens={trilha} />

          <div className="casca-ferramentas">
            {indicador}
            <Sino
              total={totalNaoLidas}
              usuarioId={usuario?.id}
              rotaTodas={dadosDoPapel.rotaNotificacoes}
              textoVazio={dadosDoPapel.textoSemAvisos}
              listar={dadosDoPapel.listarAvisos}
              marcarLida={dadosDoPapel.marcarAvisoLido}
              descrever={dadosDoPapel.descreverAviso}
            />
            <ThemeToggle compacto />
            <MenuUsuario
              usuario={usuario}
              nomePadrao={dadosDoPapel.nomePadrao}
              rotaPerfil={dadosDoPapel.rotaPerfil}
              saindo={saindo}
              onSair={handleSair}
              onAbrirMinhaTurma={
                papel === 'ALUNO'
                  ? () => setMinhaTurmaAberta(true)
                  : undefined
              }
              botaoRef={botaoAvatarRef}
            />
          </div>
        </div>
      </header>

      {!imersivo && gavetaAberta && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Fechar menu de navegação"
          onClick={fecharGaveta}
          className="casca-veu"
        />
      )}

      {!imersivo && (
        <nav
          ref={navegacaoRef}
          id={ID_NAVEGACAO}
          aria-label={dadosDoPapel.rotuloNavegacao}
          data-aberta={gavetaAberta}
          className="casca-trilho"
        >
          <ul>
            {itens.map((item) => (
              <li key={item.chave}>
                <ItemDeNavegacao
                  item={item}
                  onNavegar={fecharGaveta}
                />
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main
        id={ID_CONTEUDO}
        tabIndex={-1}
        inert={gavetaAberta}
        className="casca-conteudo"
      >
        {classeConteudo ? (
          <div className={classeConteudo}>{children}</div>
        ) : (
          children
        )}
      </main>

      {papel === 'ALUNO' && (
        <MinhaTurmaDialogo
          aberto={minhaTurmaAberta}
          onFechar={() => setMinhaTurmaAberta(false)}
          onSaiu={concluirSaidaDaTurma}
          retornoFocoRef={botaoAvatarRef}
        />
      )}
    </div>
  )
}
