# Segurança das dependências

Revisão atualizada em 12 de outubro de 2026 com `npm audit --omit=dev --json` e atualização direcionada de dependências dentro das faixas existentes.

## Resultado atual

- **Frontend:** 0 vulnerabilidades informadas pelo gerenciador após atualizar `axios` e `source-map-js` no lockfile.
- **Backend:** 6 alertas (5 altos e 1 moderado) permanecem na árvore transitiva do Prisma.
- Backend: atualizados `multer` (2.4.0), `mariadb` direto (3.5.4), `proxy-addr` (2.0.8), `brace-expansion` (5.0.12), `fast-uri` (3.1.8), `ip-address` (10.7.4), `js-yaml` (4.3.2) e `morgan` (1.12.1), respeitando as faixas existentes. O logger HTTP do aplicativo foi substituído por registros estruturados com lista positiva de metadados.

A consulta anterior a essas atualizações apontou 13 alertas no backend (incluindo um crítico) e 2 altos no frontend. Após as atualizações, o backend ficou com 6 (5 altos, 1 moderado, zero críticos). A contagem é de pacotes sinalizados pelo npm, não de falhas exploradas nem de comprovação de ausência de vulnerabilidades.

Os alertas restantes atingem `deepmerge-ts`, `mysql2` e a cópia de `mariadb` trazida por `@prisma/adapter-mariadb`. O npm não oferece correção compatível para todos eles na versão atual; a sugestão automática com `--force` rebaixa o Prisma para a versão principal 6 e pode quebrar schema, configuração, adapter, migrations e runtime. Por isso, ela não foi aplicada.

O adapter mantém sua cópia `mariadb@3.4.5`, apesar da atualização do pacote direto. Não foi aplicado override que altere a dependência fixada pelo adapter. As versões de Prisma, client e adapter continuam 7.9.1.

Após as atualizações, o backend passou em 251 testes e o frontend inicialmente em 51. Após as correções adicionais de contraste, upload e mensagem de revisão linguística, a verificação final passou em 54 testes do frontend, lint de ambos os pacotes e build. As evidências estão no relatório de entrega.

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
