# Avaliação da análise por IA

## Objetivo e limites

O harness reproduz a execução do contrato estruturado usado pela LÉXIS, registra a versão do prompt, valida a resposta, mede latência e falhas e compara evidências posicionais com uma referência. Ele não transforma uma demonstração em validação científica.

A saída atual do Gemini é consultiva: diagnóstico, orientações e evidências no texto. Ela não contém notas. Por isso, erro absoluto e concordância de notas são marcados como `NAO_APLICAVEL`; as métricas compatíveis são validade estrutural, falhas, latência, precisão, revocação e F1 das evidências.

## Modos de execução

### Fixture técnica, sem custo

```powershell
cd backend
npm.cmd run ai:evaluate -- --modo=fixture --limite=2
```

O arquivo `evaluation/fixtures/synthetic-v1.json` é inteiramente fictício e existe para testar o harness. Números produzidos por ele não representam desempenho do Gemini e não devem aparecer como resultado científico no TCC.

### Execução real, com travas

O modo real exige simultaneamente:

1. uma `GEMINI_API_KEY` válida no ambiente local;
2. `AI_EVALUATION_REAL_ENABLED=true` no ambiente;
3. a opção `--confirmar-custo` no comando;
4. um limite explícito entre 1 e 20 casos.

```powershell
npm.cmd run ai:evaluate -- --modo=real --confirmar-custo --limite=1 --entrada=C:\caminho\avaliacao-autorizada.json --rotulo=experimento-v1
```

O modo real pode gerar custo e enviar o texto das redações ao provedor. Só use conteúdo autorizado, minimizado e compatível com o protocolo aprovado para a pesquisa. Nunca versione o corpus, credenciais ou os relatórios de `backend/output`.

## Comparação de versões

Execute o mesmo conjunto, critérios e referências com cada versão identificada do prompt e preserve externamente os relatórios JSON/Markdown. Compare versões somente sob as mesmas condições. O campo `rotulo` ajuda a identificar a execução; a versão efetiva do prompt vem do código.

## Essay-BR

O [Essay-BR](https://github.com/lplnufpi/essay-br) reúne redações dissertativo-argumentativas brasileiras e notas humanas por competência do ENEM. O repositório declara [licença MIT](https://github.com/lplnufpi/essay-br/blob/main/LICENSE), que exige preservar o aviso de copyright e a licença nas redistribuições.

Ele é potencialmente útil para estudar concordância de notas em um experimento separado, desde que o acesso, a finalidade acadêmica, a atribuição, a privacidade e a licença sejam confirmados. Entretanto, a saída atual da LÉXIS não atribui notas e o corpus não fornece os intervalos de caracteres das evidências. Assim, ele não é suficiente sozinho para avaliar os destaques posicionais. Essa métrica exige uma pequena amostra anotada por avaliadores humanos, com protocolo e concordância entre avaliadores.

O corpus não é baixado nem incluído automaticamente no projeto. A avaliação acadêmica real permanece pendente externa.

## O que cada verificação comprova

- **Teste de integração:** módulos, banco e rotas respeitam o contrato em cenários controlados.
- **Demonstração manual:** um fluxo observado funcionou naquele momento.
- **Avaliação do prompt:** versões do prompt são comparadas no mesmo conjunto e com as mesmas métricas.
- **Avaliação do sistema de IA:** mede comportamento em uma amostra representativa, com referências humanas e análise de erros.
- **Validação acadêmica:** inclui desenho metodológico, amostragem, avaliadores, ética/privacidade, estatística, limitações e reprodutibilidade.
