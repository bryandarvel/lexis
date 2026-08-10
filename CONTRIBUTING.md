# Guia de colaboração

## Regra principal

A branch `main` representa a versão integrada do projeto. Nenhum integrante deve desenvolver diretamente nela. Cada alteração deve ser feita em uma branch própria e incorporada por Pull Request.

## Clonar o projeto

```powershell
git clone URL_DO_REPOSITORIO
cd "TCC - LÉXIS"
```

Depois do clone, cada desenvolvedor deve criar seus próprios arquivos `.env` a partir dos exemplos e instalar as dependências descritas no [README.md](README.md).

## Criar uma branch

Antes de iniciar uma tarefa:

```powershell
git switch main
git pull origin main
git switch -c feat/nome-curto-da-tarefa
```

Prefixos recomendados:

- `feat/`: nova funcionalidade;
- `fix/`: correção de erro;
- `docs/`: documentação;
- `refactor/`: reorganização sem mudança funcional;
- `test/`: criação ou ajuste de testes.

Exemplos:

```text
feat/tela-redacao-aluno
fix/renovacao-token
docs/modelagem-banco
```

## Registrar e publicar o trabalho

```powershell
git status
git add .
git commit -m "feat: adiciona tela de redação do aluno"
git push -u origin feat/nome-curto-da-tarefa
```

No GitHub, abra um Pull Request da sua branch para `main`. O outro integrante revisa a alteração antes do merge.

## Atualizar uma branch com a `main`

Quando a `main` receber alterações novas:

```powershell
git switch main
git pull origin main
git switch feat/nome-curto-da-tarefa
git merge main
```

Se houver conflitos, resolva os arquivos indicados pelo Git, execute as verificações do projeto e finalize o merge:

```powershell
git add .
git commit
git push
```

## Antes de abrir um Pull Request

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
