# Revisão Prisma — #104 / novembro de 2026

Bryan aprovou atualizar o conjunto `prisma`, `@prisma/client` e `@prisma/adapter-mariadb` de 7.10.0 para **7.10.1**. Branch baseada na dev a47854b, sem combinar os demais PRs. Sem nova migration de produto, override, downgrade ou alteração de banco de demonstração.

## Resolução conferida

O adapter utiliza `mariadb@3.5.4`, deduplicado com o pacote direto; a cópia vulnerável 3.4.5 deixa de ser necessária. A CLI utiliza `mysql2@3.24.4` e `@prisma/config@7.10.1` utiliza `deepmerge-ts@8.0.2`. Dependências internas de configuração e SQL foram resolvidas pelo pacote aprovado; nenhum novo pacote direto foi adicionado. O diff remove os caminhos antigos que se tornaram desnecessários.

O pacote interno `@prisma/engines-version` tem o identificador `8.1.0-1.d1b3f377ca835d73fd50954a5e22128b9ebdd6b8`: é a dependência exata publicada por `@prisma/engines@7.10.1`, conferida com npm view. Não é instalação da CLI/Client Prisma8: os três pacotes públicos e engines permanecem em7.10.1. Não foi usado `@latest` nem atendido o aviso de upgrade principal da CLI.

Fontes: [release oficial7.10.1](https://github.com/prisma/orm/releases/tag/7.10.1) e metadados publicados npm view dos pacotes/versionamentos, conferidos em03/11/2026.

## Auditorias nesta branch

| Momento | Backend completo | Backend omit=dev |
|---|---|---|
| Antes | 14: 8 altos,6 moderados,0 críticos | 14: 8 altos,6 moderados,0 críticos |
| Depois de somente este recorte | 8: 3 altos,5 moderados,0 críticos | 8: 3 altos,5 moderados,0 críticos |

Permanecem body-parser, fast-uri, glob, minimatch, multer, qs, swagger-jsdoc e zod. Os recortes #105/#106 são independentes e ainda não compõem a base desta medição. A sugestão automática de rebaixar swagger-jsdoc6.3.0 para6.2.8 não foi aplicada; exige decisão própria. Alertas não são contagem de explorações comprovadas nem prova de ausência de outros problemas.

## Verificações

- Node24.16.0; npm ci reproduzível após atualização intencional do lockfile. Avisos de depreciação de node-domexception e glob permaneceram e não foram mascarados.
- Prisma validate/generate7.10.1 aprovados.
- Conferência somente leitura de DATABASE() = lexis_test e tabela de migrations: as três migrations desta base estão aplicadas e sem execução pendente/interrompida. Existem também migrations de #97/#102 nesse banco compartilhado; não se afirmou paridade total do schema desta branch nem se apagou o histórico para consegui-la. O CI utiliza banco novo e as migrations desta branch.
- Backend lint e **288/288 testes**,59 suítes,0 falhas/cancelamentos/ignorados. Incluem as regressões existentes de concorrência, persistência e transação.
- Frontend inalterado: lint, **98/98 testes** e build aprovados.
- Diff de versões revisado; sem mudança de código de domínio, migrations, telas, configuração pessoal ou integrações reais. Nenhum seed/reset/migration em banco remoto.

PR apenas para dev, sujeito à revisão do Lucas e CI verde. Depois de combinar os recortes e os backends novos, repetir instalação, geração, testes e auditoria na base conjunta; estes números não representam a integração futura.
