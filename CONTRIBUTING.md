# Guia de colaboração

## Regra principal

A branch `main` representa a versão integrada do projeto. Nenhum integrante deve desenvolver diretamente nela. Toda correção, melhoria ou nova funcionalidade começa por uma Issue, é implementada em uma branch própria e incorporada por Pull Request.

## Aceitar o convite

Como o repositório é privado, o novo colaborador deve primeiro aceitar o convite enviado pelo proprietário. Para isso:

1. entre no GitHub com a conta que recebeu o convite;
2. abra a notificação ou o e-mail enviado pelo GitHub;
3. aceite o convite para o repositório `bryandarvel/lexis`.

Enquanto o convite não for aceito, o clone pode retornar a mensagem `Repository not found`.

## Clonar o projeto

```powershell
cd 'C:\Users\NOME_DO_USUARIO\Documents'
git clone https://github.com/bryandarvel/lexis.git
cd lexis
```

Depois do clone, cada desenvolvedor deve criar seus próprios arquivos `.env` a partir dos exemplos e instalar as dependências descritas no [README.md](README.md).

## Criar uma Issue

Antes de alterar o código, abra uma Issue usando o modelo correspondente:

- correção de erro;
- melhoria técnica ou de experiência;
- nova funcionalidade.

A Issue deve explicar o problema ou objetivo, o escopo e os critérios de aceite. Anote o número gerado pelo GitHub, pois ele será usado na branch e no Pull Request.

## Criar uma branch

Antes de iniciar uma tarefa:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/NUMERO-nome-curto-da-tarefa
```

Prefixos recomendados:

- `feat/`: nova funcionalidade;
- `fix/`: correção de erro;
- `docs/`: documentação;
- `refactor/`: reorganização sem mudança funcional;
- `test/`: criação ou ajuste de testes.
- `chore/`: configuração, automação ou manutenção.

Exemplos:

```text
feat/42-tela-redacao-aluno
fix/57-renovacao-token
docs/63-modelagem-banco
```

## Registrar e publicar o trabalho

```powershell
git status
git add caminho/do/arquivo1 caminho/do/arquivo2
git diff --staged
git commit -m "feat: adiciona tela de redação do aluno"
git push -u origin feat/NUMERO-nome-curto-da-tarefa
```

Evite `git add .` e `git add -A`: selecione somente os arquivos da tarefa e confira o diff preparado antes do commit.

No GitHub, abra um Pull Request da sua branch para `main`. Preencha o modelo, inclua `Closes #NUMERO` na descrição e solicite a revisão do outro integrante. O merge só deve ocorrer depois que o CI estiver verde e a revisão for aprovada.

## Atualizar uma branch com a `main`

Quando a `main` receber alterações novas:

```powershell
git switch main
git pull --ff-only origin main
git switch feat/NUMERO-nome-curto-da-tarefa
git merge main
```

Se houver conflitos, resolva os arquivos indicados pelo Git, execute as verificações do projeto e finalize o merge:

```powershell
git add caminho/do/arquivo-resolvido
git commit
git push
```

## Antes de abrir um Pull Request

Confirme que o Pull Request contém apenas o escopo da Issue e execute as verificações afetadas.

Backend:

```powershell
cd backend
npm.cmd run lint
npm.cmd test
```

Frontend:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

## Arquivos que nunca entram no commit

- `.env`;
- `node_modules/`;
- `dist/`;
- `coverage/`;
- `tmp/`;
- chaves, senhas ou tokens pessoais.

Em caso de dúvida, execute `git status` e revise cada arquivo antes do `git add`.

## Depois do merge

```powershell
git switch main
git pull --ff-only origin main
git branch -d feat/NUMERO-nome-curto-da-tarefa
```

A exclusão da branch local só deve ser feita depois de confirmar que o Pull Request foi integrado.
