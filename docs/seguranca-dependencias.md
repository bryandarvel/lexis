# Segurança das dependências

Auditoria executada em 5 de setembro de 2026 com `npm audit --omit=dev`.

## Resultado atual

- **Frontend:** 0 vulnerabilidades após a atualização não destrutiva do lockfile.
- **Backend:** 6 alertas (5 altos e 1 moderado) permanecem na árvore transitiva do Prisma.
- Alertas corrigíveis sem mudança principal, incluindo `fast-uri` e `qs`, foram atualizados no lockfile.

Os alertas restantes atingem `deepmerge-ts`, `mysql2` e a cópia de `mariadb` trazida por `@prisma/adapter-mariadb`. O npm não oferece correção compatível para todos eles na versão atual; a sugestão automática com `--force` rebaixa o Prisma para a versão principal 6 e pode quebrar schema, configuração, adapter, migrations e runtime. Por isso, ela não foi aplicada.

## Exposição e medidas atuais

- O MySQL de desenvolvimento está ligado somente a `127.0.0.1` e usa `utf8mb4`.
- Credenciais e bancos de desenvolvimento não devem ser reutilizados em produção.
- O projeto não deve ser publicado como serviço de produção antes de revisar a versão estável do Prisma/adapter que corrige os advisories e repetir a suíte completa.
- Não aceite parâmetros de conexão, charsets ou objetos de configuração controlados por usuários.

## Próxima revisão

1. consultar os advisories citados pelo `npm audit` e as versões estáveis do Prisma;
2. atualizar `prisma`, `@prisma/client` e `@prisma/adapter-mariadb` juntos em uma Issue própria;
3. executar migrations em banco temporário, os testes do backend, lint, seed e uma demonstração manual;
4. confirmar `npm audit --omit=dev` sem usar `--force` cegamente.
