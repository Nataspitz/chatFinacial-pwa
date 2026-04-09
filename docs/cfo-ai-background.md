# CFO IA Background (safe-first)

## Objetivo
Criar uma camada de assistente financeiro profissional sem alterar schema de producao no Supabase nesta fase.

## Escopo implementado na branch `dev`
- Snapshot financeiro estruturado (receita, despesa, lucro, margem, crescimento, alertas).
- Forecast de caixa para horizonte configuravel, com recorrencia e transacoes futuras.
- Assistente CFO com fallback local deterministico.
- Integracao opcional com endpoint remoto via `VITE_CFO_AGENT_ENDPOINT`.
- Acionamento dentro do chat via botao rapido `CFO IA`.

## Sem risco em banco nesta fase
- Nenhuma migration nova.
- Nenhuma tabela nova.
- Nenhum `rpc` novo.
- Apenas leitura de dados existentes de `transactions`.

## Proximo passo seguro antes de Supabase
- Criar endpoint backend intermediario (`/api/cfo/chat`) fora do banco.
- Fazer observabilidade de prompts/respostas e custo.
- Validar qualidade em staging.
- Somente depois avaliar persistencia de snapshots/insights no Supabase.

## Contrato de contexto para IA
Estrutura base do snapshot:

```json
{
  "period": { "year": 2026, "month": 4, "label": "Abr/2026" },
  "totals": { "revenue": 0, "expense": 0, "profit": 0, "margin": null },
  "growth": { "revenue": null, "expense": null, "profit": null },
  "alerts": [],
  "forecast": {
    "days": 30,
    "startingBalance": 0,
    "estimatedEndingBalance": 0,
    "estimatedRevenue": 0,
    "estimatedExpense": 0,
    "points": []
  }
}
```
