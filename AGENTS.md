# Instruções para agentes

Estas regras se aplicam a qualquer agente de IA que trabalhe neste repositório.

## Fluxo obrigatório

1. Leia a Issue relacionada antes de alterar arquivos.
2. Não desenvolva diretamente na branch `main`.
3. Use uma branch no formato `tipo/NUMERO-descricao-curta`, por exemplo `feat/42-editor-redacao`.
4. Mantenha a alteração dentro do escopo e dos critérios de aceite da Issue.
5. Preserve mudanças existentes que não pertençam à tarefa.
6. Não faça commit, push, merge ou abra Pull Request sem autorização explícita do usuário.
7. No Pull Request, inclua `Closes #NUMERO` e descreva as verificações executadas.

## Qualidade e verificação

- Backend: execute `npm.cmd run lint` e `npm.cmd test` dentro de `backend`.
- Frontend: execute `npm.cmd run lint` e `npm.cmd run build` dentro de `frontend`.
- Adicione ou atualize testes quando houver mudança de comportamento.
- Não contorne erros de lint, testes ou build; investigue a causa.
- Não introduza uma nova biblioteca sem justificar a necessidade e obter aprovação.

## Segurança e dados locais

- Nunca versione `.env`, chaves de API, segredos JWT, senhas, tokens ou dados pessoais.
- Nunca use `git add .` ou `git add -A`; prepare somente caminhos revisados.
- Não apague nem sobrescreva alterações do usuário sem autorização.
- `node_modules`, `dist`, `coverage`, `tmp` e `output` são artefatos locais ou gerados.

## Interface

- Respeite `prefers-reduced-motion` e acessibilidade por teclado.
- Use skeleton apenas para conteúdo assíncrono cujo espaço seja previsível.
- Use lazy loading em rotas e recursos pesados quando trouxer benefício real.
- Mostre progresso nas operações de upload, OCR e análise por IA.
- Motion e GSAP devem apoiar hierarquia e compreensão, sem animações gratuitas ou concorrentes.

As instruções humanas e a rotina completa estão em [CONTRIBUTING.md](CONTRIBUTING.md).
