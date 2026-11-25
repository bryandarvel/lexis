# B36 - revisão de dependências

Issue: [#28](https://github.com/bryandarvel/lexis/issues/28). Branch: `chore/28-revisao-dependencias`. Base de integração: `dev` em `2e6a2e6`.

## Mudanças

O responsável aprovou a atualização conjunta de `prisma`, `@prisma/client` e `@prisma/adapter-mariadb` de 7.9.1 para 7.10.0. Manifest e lockfile foram atualizados; somente os 12 registros internos correspondentes do conjunto Prisma mudaram no lockfile. Foram preservadas as versões dos outros pacotes. Não houve downgrade, override, Prisma 8 RC, schema novo ou alteração de migration.

Arquivos para revisão: `backend/package.json`, `backend/package-lock.json`, `docs/seguranca-dependencias.md` e este relatório. `node_modules`, Client gerado, `tmp`, `.env` e `dist` não entram no commit.

## Verificação

Linha de base: Node 24.16.0/npm 11.13.0; backend lint e 272 testes aprovados; frontend lint, 70 testes e build aprovados.

Após atualização:

| Comando | Resultado |
| --- | --- |
| Backend `npm.cmd ci` | Aprovado; lockfile reproduzível |
| `npx.cmd prisma validate` | Schema válido |
| `npx.cmd prisma generate --no-hints` | Client 7.10.0 gerado |
| `npx.cmd prisma migrate deploy` | Três migrations existentes, nenhuma pendente, somente em `lexis_test` local previamente confirmado |
| Backend `npm.cmd run lint` / `npm.cmd test` | 272 testes em 59 suites, zero falhas/cancelamentos; lint aprovado |
| Frontend `npm.cmd run lint` / `npm.cmd test` / `npm.cmd run build` | Lint, 70 testes e build Vite 8.1.5 aprovados |
| Auditorias completa e `--omit=dev` | Backend: seis pacotes sinalizados (cinco altos, um moderado); frontend: zero |
| `git diff --check` | Aprovado |

O destino das migrations foi validado por hostname loopback, nome da URL e `SELECT DATABASE()`. A URL foi definida explicitamente no processo de migration como `TEST_DATABASE_URL`. Não houve seed ou escrita no banco de desenvolvimento `lexis`. Testes externos usam fixtures/mocks e não comprovam disponibilidade dos provedores reais.

## Limitações

Os seis alertas transitivos permanecem. A nova versão mantém o driver MariaDB 3.4.5 do adapter, mysql2 3.15.3 e deepmerge-ts 7.1.5. O relatório de segurança descreve caminhos, aplicabilidade e limites. Não foi alegada ausência de vulnerabilidades ou prontidão para operação pública.

As demais branches técnicas partem da mesma `dev` e não dependem funcionalmente desta atualização não commitada. O teste combinado após integração deve confirmar novamente o conjunto final. B03 na máquina do Lucas permanece separado.

## Reprodução após obter esta branch

Dentro de `backend/`, execute `npm.cmd ci`, `npx.cmd prisma validate`, `npx.cmd prisma generate --no-hints`, lint e testes. Antes dos testes, confirme seu `TEST_DATABASE_URL` local e as migrations existentes. **Não execute `migrate deploy` sem conferir `DATABASE_URL`**, porque a CLI usa essa variável, não seleciona automaticamente o banco de testes.

No frontend, execute lint, testes e build. Não é necessário reinstalar dependências frontend por esta alteração.

## Commit e PR preparados, não executados

Commit sugerido: `chore: revisa conjunto Prisma e documenta riscos remanescentes`.

Título do PR: `chore: entrega revisão de dependências B36`.

Descrição sugerida:

```text
Closes #28

Atualiza o conjunto Prisma aprovado para 7.10.0, preserva outros pacotes e documenta seis alertas transitivos remanescentes e seus limites de exposição.

Verificado: instalação limpa, schema, Client, migrations existentes no lexis_test local, lint, 272 testes backend, 70 frontend e build. Não houve seed, envio externo, mudança de telas ou alteração de main/dev.

Não garante ausência de vulnerabilidades nem libera operação pública. Detalhes em docs/seguranca-dependencias.md e docs/entrega-b36.md.
```

O usuário fará commit, push e abertura de PR para `dev`; nada disso foi executado pelo agente. Como `dev` não é a branch padrão, a referência `Closes` não fecha automaticamente a Issue nessa integração.
