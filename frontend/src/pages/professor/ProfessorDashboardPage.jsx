import {
  useEffect,
  useState,
} from 'react'

import HeroBanner from '../../components/ui/HeroBanner.jsx'
import ContentCard from '../../components/ui/ContentCard.jsx'
import ContentRail from '../../components/ui/ContentRail.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { listarTurmas } from '../../services/turmas.js'

function formatarData(value) {
  if (!value) {
    return 'Data indisponível'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(date)
}

function TurmaSkeleton() {
  return (
    <div className="min-h-[18rem] w-[18rem] animate-pulse rounded-2xl border border-lexis-200/10 bg-lexis-900/70 sm:w-[22rem]">
      <div className="h-full min-h-[18rem] rounded-2xl bg-gradient-to-br from-lexis-800/60 to-lexis-950" />
    </div>
  )
}

export default function ProfessorDashboardPage() {
  const { usuario } = useAuth()

  const [turmas, setTurmas] = useState([])
  const [turmasStatus, setTurmasStatus] =
    useState('carregando')

  const primeiroNome =
    usuario?.nome?.split(' ')[0] ??
    'Professor'

  useEffect(() => {
    let componentActive = true

    async function carregarTurmas() {
      try {
        const result = await listarTurmas()

        if (componentActive) {
          setTurmas(
            Array.isArray(result)
              ? result
              : [],
          )

          setTurmasStatus('pronto')
        }
      } catch {
        if (componentActive) {
          setTurmasStatus('erro')
        }
      }
    }

    carregarTurmas()

    return () => {
      componentActive = false
    }
  }, [])

  const emptyMessage =
    turmasStatus === 'erro'
      ? 'Não foi possível carregar as turmas. Verifique a conexão com a API.'
      : 'Você ainda não possui turmas cadastradas.'

  return (
    <DashboardLayout>
      <HeroBanner
        eyebrow={`Olá, ${primeiroNome}`}
        title="Transforme redações em aprendizado orientado."
        description="Gerencie suas turmas, publique temas e acompanhe cada redação em um ambiente construído para tornar a correção mais clara e organizada."
        metadata={[
          'Turmas e temas integrados',
          'OCR e inteligência artificial',
          'Feedback com histórico',
        ]}
        primaryAction={{
          label: 'Ver minhas turmas',
          href: '#turmas',
        }}
        secondaryAction={{
          label: 'Acompanhar redações',
          href: '#redacoes',
        }}
      />

      <ContentRail
        id="turmas"
        eyebrow="Organização"
        title="Suas turmas"
        description="Acesse os códigos, temas e participantes de cada turma."
        emptyMessage={emptyMessage}
      >
        {turmasStatus === 'carregando'
          ? [0, 1, 2].map((item) => (
              <TurmaSkeleton key={item} />
            ))
          : turmas.map((turma, index) => (
			<ContentCard
				key={turma.id}
				eyebrow="Turma"
				title={turma.nome}
				description={`Código de acesso: ${turma.codigoAcesso}`}
				status={
				turma.ativa
				? 'Ativa'
				: 'Arquivada'
			}
			details={[
						`${turma.quantidadeAlunosAtivos ?? 0} alunos`,
						`${turma.quantidadeTemasAtivos ?? 0} temas`,
						`Criada em ${formatarData(turma.criadoEm)}`,
			]}
			accentIndex={index}
			to={`/professor/turmas/${turma.id}`}
			actionLabel="Abrir turma"
			/>
		))}
      </ContentRail>

      <div className="border-t border-lexis-200/10">
        <ContentRail
          id="redacoes"
          eyebrow="Acompanhamento"
          title="Redações recentes"
          description="Redações enviadas, analisadas ou aguardando sua correção."
          emptyMessage="As redações recentes serão exibidas aqui."
        />
      </div>
    </DashboardLayout>
  )
}