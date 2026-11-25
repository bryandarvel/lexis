# Patches de backend — #105

Recorte aprovado por Bryan em03/11/2026, em branch própria baseada na dev a47854b. Não inclui a atualização Prisma da #104; a base ainda usa7.10.0 por esse motivo. Nenhuma dependência nova direta, override, downgrade de pacote do projeto ou mudança de código de domínio.

| Caminho resolvido | Antes | Depois |
|---|---|---|
| multer | 2.4.0 | 2.5.0 |
| zod | 4.4.3 | 4.6.6 |
| body-parser | 2.3.0 | 2.4.0 |
| body-parser/content-type | 2.0.0 | 2.1.0 |
| qs | 6.16.0 | 6.17.1 |
| fast-uri | 3.1.8 | 3.1.9 |

Multer/Zod ficam fixados nas versões aprovadas. As transitivas continuam dentro das faixas dos seus pais; content-type é dependência da versão aprovada de body-parser. Prisma, SDK Gemini, Express, React/Tailwind e telas não mudaram.

O [advisory oficial do Multer](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m) descreve fileFilter assíncrono após encerramento da requisição. O filtro do LÉXIS chama callback sincronicamente; não foi demonstrada exploração desse cenário na aplicação. A atualização é preventiva, sem reduzir limites de upload ou validação de assinatura/tipo.

## Auditoria e verificação

- Antes:14 pacotes sinalizados (8 altos/6 moderados). Depois deste recorte isolado: **9 (5 altos/4 moderados), zero crítico**, tanto completo quanto omit=dev.
- Permanecem os caminhos Prisma/driver/config e glob/minimatch/swagger-jsdoc. O patch Prisma é outro PR; não somar medidas de branches para afirmar um resultado integrado. A sugestão de rebaixar Swagger não foi aplicada.
- npm ci reproduzível e Prisma generate aprovados. Os avisos de depreciação node-domexception/glob foram conservados, não mascarados.
- Backend lint e **288/288 testes**,59 suítes, sem falhas/cancelamentos/ignorados. Incluem upload JPEG/PNG, assinatura/tamanho/campo, validação, contratos e persistência existentes; nenhum provedor real foi chamado.
- Frontend inalterado: lint, **98/98 testes** e build aprovados. Banco de teste local lexis_test confirmado; nenhum seed/reset/migration remota ou dado de demonstração alterado.
- Diff limitado a dois manifests, seis caminhos de resolução e este registro; `git diff --check` aprovado.

Na integração, combinar com #104 sem perder nenhum dos dois lockfiles: resolver a árvore pelos manifests aprovados e repetir npm ci/audit/lint/testes. Revalidar também o tratamento de parser da #93 e os schemas novos de #42/#71 na base conjunta; eles não foram assumidos como já integrados nesta branch. CI e revisão do Lucas precedem merge commit somente na dev. Não há promoção para main.
