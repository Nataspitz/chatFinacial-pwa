# Prompt-base: Planejamento de Caixa

Implemente a evolução da página de metas para uma experiência de Planejamento de Caixa.

## Intenção do produto

O usuário precisa dividir mentalmente o dinheiro em conta em partes planejadas, sem criar subcontas bancárias reais.

Categorias continuam respondendo: "com o que foi a transação?"

Planejamento de Caixa responde: "para que esse dinheiro está separado?"

## Comportamento esperado

- A página atual de Metas deve virar "Planejamento de Caixa".
- Cada item pode representar uma meta, uma reserva recorrente ou um provisionamento de contas.
- Cada item pode ter valor alvo, valor reservado atual, regra mensal fixa ou percentual sobre faturamento.
- Itens marcados como reservados reduzem o dinheiro livre real.
- O usuário deve conseguir ver quanto do caixa está reservado e quanto ficaria livre.
- As transações continuam usando categorias no relatório; depois, uma próxima etapa pode ligar uma saída a uma reserva específica.

## Campos mínimos por item

- Nome.
- Tipo: meta, reserva ou contas.
- Valor alvo.
- Valor reservado atual.
- Considerar como dinheiro reservado.
- Regra mensal: valor fixo ou percentual do faturamento.
- Valor da regra mensal.
- Categorias vinculadas em texto livre para sugestão futura.

## Fora do escopo da primeira UI

- Baixar saldo de reserva automaticamente ao lançar despesa.
- Criar histórico de transferências internas.
- Fazer IA recomendar distribuição.
- Criar subcontas reais.
- Bloquear transações por falta de saldo na reserva.
