# Atualizar a máquina para testar a dev

Vale para Bryan e Lucas, em suas respectivas cópias locais. A `dev` reúne os trabalhos integrados; a `main` não foi atualizada nesta etapa.

## 1. Salvar o trabalho antes de trocar de branch

Na raiz do projeto:

```powershell
git status
```

Se houver alterações, pare e salve/revise o trabalho na branch da tarefa. Não use reset, limpeza de arquivos nem descarte para conseguir trocar de branch.

## 2. Atualizar o código

Com o diretório limpo, ainda na raiz:

```powershell
git fetch origin
git switch dev
git pull --ff-only origin dev
git status
```

Se o pull indicar divergência, não use force/reset: confira os commits antes de continuar. Não desenvolva diretamente na dev ou main; depois dos testes, crie/retome a branch da sua Issue.

## 3. Preparar o backend

Preserve o `.env` de cada máquina e suas próprias credenciais. Confira que `DATABASE_URL` aponta para o MySQL local de desenvolvimento antes de aplicar a migration. Nunca aponte esse comando para produção ou um banco remoto sem autorização.

```powershell
cd backend
npm.cmd ci
docker compose up -d
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run dev
```

A migration de recuperação adiciona versão de sessão e a tabela de links de recuperação; não converte critérios históricos. Não é necessário apagar o banco nem executar o seed novamente. Mantenha as senhas e dados locais já configurados. A nova variável `PASSWORD_RESET_TTL_MINUTES` tem padrão de 30 minutos.

## 4. Preparar o frontend

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Abra o endereço informado pelo Vite. Se a sessão anterior não funcionar, faça login novamente. Não compartilhe senhas, tokens ou arquivos `.env`.

## 5. Conferência manual

- Aluno: painel, desempenho, redações e consulta de feedback.
- Professor: painel, turmas, propostas, critérios e correção.
- OCR: selecionar material fictício, extrair, revisar, salvar e enviar.
- Critérios: três fixos e até dois personalizados, sem pesos; históricos preservados.
- Recuperação: depende de e-mail habilitado e fila supervisionada conforme [operacao-email.md](operacao-email.md). Não execute o worker sem revisar destinatários e mensagens pendentes.

Integrações externas dependem das credenciais/cotas locais. CI aprovado não comprova disponibilidade do Gemini, OCR.space, LanguageTool ou Resend na máquina de cada integrante.
