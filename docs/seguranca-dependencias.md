# Segurança das dependências

Revisão B36 da Issue #28. Linha de base registrada em 13 de outubro de 2026; conferência com `npm audit --json` e `npm audit --omit=dev --json`, seguida da atualização expressamente aprovada do conjunto Prisma.

## Resultado atual

- **Frontend:** 0 vulnerabilidades informadas pelo gerenciador após atualizar `axios` e `source-map-js` no lockfile.
- **Backend:** 6 alertas (5 altos e 1 moderado) permanecem na árvore transitiva do Prisma.
- Backend: atualizados `multer` (2.4.0), `mariadb` direto (3.5.4), `proxy-addr` (2.0.8), `brace-expansion` (5.0.12), `fast-uri` (3.1.8), `ip-address` (10.7.4), `js-yaml` (4.3.2) e `morgan` (1.12.1), respeitando as faixas existentes. O logger HTTP do aplicativo foi substituído por registros estruturados com lista positiva de metadados.

A consulta anterior a essas atualizações apontou 13 alertas no backend (incluindo um crítico) e 2 altos no frontend. Após as atualizações, o backend ficou com 6 (5 altos, 1 moderado, zero críticos). A contagem é de pacotes sinalizados pelo npm, não de falhas exploradas nem de comprovação de ausência de vulnerabilidades.

Os alertas restantes atingem `deepmerge-ts`, `mysql2` e a cópia de `mariadb` trazida por `@prisma/adapter-mariadb`. O npm não oferece correção compatível para todos eles na versão atual; a sugestão automática com `--force` rebaixa o Prisma para a versão principal 6 e pode quebrar schema, configuração, adapter, migrations e runtime. Por isso, ela não foi aplicada.

O adapter mantém sua cópia `mariadb@3.4.5`, apesar da atualização do pacote direto. Não foi aplicado override que altere a dependência fixada pelo adapter. Prisma, client e adapter passaram juntos de 7.9.1 para **7.10.0**, após aprovação. Não foi usado `@latest`, Prisma 8 RC ou downgrade para a versão 6.

A release 7.10.0 inclui correções de pooling/transações no adapter MariaDB e de comportamento do Client; ela não remove as dependências transitivas sinalizadas nesta árvore. Consulte a [release oficial](https://github.com/prisma/orm/releases/tag/7.10.0). O lockfile preserva as demais versões: o diff altera somente o conjunto Prisma e seus pacotes internos correspondentes.

Após as atualizações, o backend passou em 251 testes e o frontend inicialmente em 51. Após as correções adicionais de contraste, upload e mensagem de revisão linguística, a verificação final passou em 54 testes do frontend, lint de ambos os pacotes e build. As evidências estão no relatório de entrega.

Essas contagens descrevem a entrega anterior. Na revisão B36, a linha de base passou em 272 testes do backend e 70 do frontend. Após o conjunto 7.10.0: `npm ci`, `prisma validate`, `prisma generate --no-hints` e lint aprovados; 272 testes backend em 59 suites e 70 frontend aprovados, zero falhas/cancelamentos; build aprovado. Foram conferidas as três migrations existentes com `DATABASE_URL` explicitamente apontada ao `lexis_test` local, após validação do hostname e `SELECT DATABASE()`: nenhuma migration pendente. Não foi aplicado seed nem alterado o banco `lexis`.

As auditorias completa e `--omit=dev` continuam com seis pacotes sinalizados no backend (cinco altos, um moderado). `prisma` é declarado em desenvolvimento, mas também é peer opcional do Client e seus caminhos aparecem na auditoria com omissão de dev. Isso não permite descartar todos os alertas como exclusivos de ferramentas.

## Caminhos e aplicabilidade

| Caminho atual | Exposição observada e limite |
| --- | --- |
| `@prisma/adapter-mariadb@7.10.0 -> mariadb@3.4.5` | Driver efetivamente usado pelo runtime. O pacote direto `mariadb@3.5.4` não substitui essa cópia. Os advisories incluem TLS/autenticação, escaping em charsets específicos, `NO_BACKSLASH_ESCAPES` e parâmetros GeoJSON. |
| `prisma@7.10.0 -> mysql2@3.15.3` | Dependência da CLI/Studio. Runtime da aplicação configurado com adapter MariaDB; exposição de ferramentas continua dependente de sua utilização e da configuração de conexão. |
| `prisma@7.10.0 -> @prisma/config@7.10.0 -> deepmerge-ts@7.1.5` | Carregamento/mesclagem de configuração; não foi identificado um endpoint que receba grafos recursivos para essa função. Não equivale a uma prova geral de inexistência de exploração. |

Na sessão local `lexis_test` inspecionada antes da atualização, o charset foi `utf8mb4` e `sql_mode` não incluiu `NO_BACKSLASH_ESCAPES`. Isso reduz a aplicabilidade do cenário específico de escaping naquela sessão, mas não elimina os demais advisories nem comprova o estado de outra sessão/ambiente. Não houve teste de exploração ou avaliação de produção.

Referências: [MariaDB/NO_BACKSLASH_ESCAPES](https://github.com/advisories/GHSA-r3rv-jm3r-62q2), [mysql2/auth downgrade](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [deepmerge/recursão](https://github.com/advisories/GHSA-ggr8-5vv4-36mx). O diagnóstico bruto inicial, sem credenciais, foi guardado localmente em `tmp/entrega-tecnica/diagnostico-b36.json` e não deve entrar no commit.

## Exposição e medidas atuais

- O MySQL de desenvolvimento está ligado somente a `127.0.0.1` e usa `utf8mb4`.
- Credenciais e bancos de desenvolvimento não devem ser reutilizados em produção.
- O projeto não deve ser publicado como serviço de produção antes de revisar a versão estável do Prisma/adapter que corrige os advisories e repetir a suíte completa.
- Não aceite parâmetros de conexão, charsets ou objetos de configuração controlados por usuários.

## Próxima revisão

1. consultar os advisories citados pelo `npm audit` e as versões estáveis do Prisma;
2. propor atualização compatível de `prisma`, `@prisma/client` e `@prisma/adapter-mariadb` juntos quando houver correção dos caminhos transitivos, obtendo aprovação antes da instalação;
3. confirmar o banco de teste antes das migrations, repetir testes/lint/build e usar seed somente em ambiente novo e isolado;
4. confirmar `npm audit --omit=dev` sem usar `--force` cegamente.
