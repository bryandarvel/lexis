# Patches do frontend — #106

Recorte expressamente aprovado por Bryan em03/11/2026 e comunicado ao Lucas na Issue. Branch baseada na dev a47854b, sem mudança de telas, AppRoutes, AuthProvider, React, ReactDOM, Tailwind, Axios ou plugins.

Vite é fixado em **8.1.6** (antes o lockfile resolvia8.1.5); `follow-redirects` permanece transitivo e resolve **1.16.2** (antes1.16.0). O diff de versões do lockfile contém exatamente esses dois caminhos; nenhum novo pacote direto, override ou upgrade de major foi adicionado.

Fonte de versão: [release oficial Vite8.1.6](https://github.com/vitejs/vite/releases/tag/v8.1.6) e metadados npm view de Vite/follow-redirects, conferidos em03/11/2026. O patch Vite foi escolhido em vez de8.3.5 para limitar o recorte aprovado.

## Verificações desta branch

- npm ci aprovado, Node24.16.0.
- npm run lint, **98/98 testes**, zero falhas/cancelamentos/ignorados, e build Vite8.1.6 aprovados.
- npm audit completo: **2 altos → 0 alertas** nesta árvore e data. Isso não prova ausência de vulnerabilidades ou exploração anterior; build, desenvolvimento e código servido no navegador têm exposições diferentes.
- Diff completo revisado e git diff --check aprovado. Nenhum segredo, chamada a provedor ou dado de teste real foi usado.

Não inclui os patches backend #104/#105 e não altera e2e/CI. Após integrar com a consolidação #36/PR #101, repetir também os novos testes SSR de componentes com cache isolado que aquele PR introduz, além do aceite conjunto; esses testes não existem na base isolada desta branch e não foram afirmados como executados aqui.

Revisão do Lucas e CI verde antes de merge commit apenas na dev. A main permanece fora do escopo.
