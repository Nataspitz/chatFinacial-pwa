# Chat Assistant Engine (Deterministico)

## Estrutura

- `src/features/chat/assistant/core`: orquestracao (normalizacao, intencao, slots, handler)
- `src/features/chat/assistant/extractors`: extratores por entidade
- `src/features/chat/assistant/vocabulary`: vocabulario e sinonimos
- `src/features/chat/assistant/actions`: execucao segura de acoes financeiras
- `src/features/chat/assistant/context`: utilitarios de sessao e memoria
- `src/features/chat/assistant/intents`: handlers leves por intencao

## Como adicionar nova intencao

1. Adicione o tipo em `src/features/chat/assistant/types.ts`.
2. Inclua regra em `src/features/chat/assistant/vocabulary/actions.vocabulary.ts`.
3. Ajuste score em `src/features/chat/assistant/core/detectIntent.ts`.
4. Se precisar de slots obrigatorios, ajuste `src/features/chat/assistant/core/resolveMissingSlots.ts`.
5. Se houver execucao, implemente/roteie em `src/features/chat/assistant/actions/executeAssistantAction.ts`.

## Como adicionar nova categoria

1. Inclua categoria e aliases em `src/features/chat/assistant/vocabulary/categories.vocabulary.ts`.
2. O extractor de categoria usa esse vocabulario em `src/features/chat/assistant/extractors/category.extractor.ts`.

## Como adicionar novo extractor

1. Crie arquivo em `src/features/chat/assistant/extractors`.
2. Conecte no `src/features/chat/assistant/core/extractSlots.ts`.
3. Exponha via wrapper em `src/features/chat/assistant` se o restante do projeto usar import direto.

