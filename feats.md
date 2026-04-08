# Planejamento de Features - Versao 2.0.0

## Objetivo da 2.0.0

Transformar o ChatFinacial de um MVP funcional em uma plataforma financeira pronta para operar em qualquer setor (PDV, hospedagem, servicos, varejo, etc), com base universal de dados financeiros, integracoes, automacoes e governanca.

## Legenda de status

| Status | Significado |
| --- | --- |
| `[x]` | Concluido |
| `[ ]` | Pendente |
| `[-]` | Bloqueado/depende de outra etapa |

## Roadmap macro (ordem de execucao)

| Ordem | Fase | Objetivo da fase | Status |
| --- | --- | --- | --- |
| 0 | Baseline atual | Fechar ajustes de usabilidade e confiabilidade no fluxo atual | `[x]` |
| 1 | Core Financeiro 2.0 | Modelar dados universais para qualquer setor | `[ ]` |
| 2 | Integracoes 2.0 | Criar camada de entrada de dados externos (API/importacao/webhook) | `[ ]` |
| 3 | Inteligencia e Fechamento | Automatizar classificacao, conciliacao e fechamento mensal | `[ ]` |
| 4 | Multiempresa e Governanca | Entregar controle por empresa/unidade/perfil e trilha de auditoria | `[ ]` |
| 5 | Release e Operacao 2.0.0 | Publicar release com qualidade, monitoramento e documentacao | `[ ]` |

## Backlog detalhado da 2.0.0 (com ordem de execucao)

| Ordem | ID | Feature | O que sera entregue (detalhado) | Dependencias | Criterio de pronto | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 0.1 | B-001 | Dashboard no mes atual por padrao | Dashboard abre em visao mensal no mes corrente; visao anual continua opcional via filtro manual. | Nenhuma | Dashboard inicia no mes atual em todos os logins | `[x]` |
| 0.2 | B-002 | Report no mes atual por padrao | Report inicia com ano/mes atual no filtro principal (evita visao "todos" por padrao). | Nenhuma | Report abre com filtro mensal atual ativo | `[x]` |
| 0.3 | B-003 | Separacao de lancamentos futuros | Entradas e saidas com data > hoje aparecem em secoes proprias ("Entradas futuras" e "Saidas futuras"). | B-002 | Listas principais exibem apenas ate hoje | `[x]` |
| 0.4 | B-004 | Ultima entrada/saida no topo do report | Exibir data do ultimo lancamento de entrada e saida usando data real de `date` (nao data de cadastro). | B-002 | Header mostra ultima entrada e ultima saida corretas | `[x]` |
| 0.5 | B-005 | Ocultar/exibir valores na dashboard | Botao com icone de olho para mascarar e revelar valores sensiveis no estilo bancario. | B-001 | Valores ficam mascarados com toggle e voltam ao normal | `[x]` |
| 1.1 | F2-001 | Plano de contas 2.0 | Estrutura de plano de contas com hierarquia (grupo, subgrupo, conta), tipo (receita/despesa/ativo/passivo) e status ativo/inativo. | Baseline concluido | CRUD de contas + validacoes + uso em lancamentos | `[ ]` |
| 1.2 | F2-002 | Centros de custo | Cadastro e vinculacao de centro de custo em cada lancamento para analise por area/unidade/processo. | F2-001 | Relatorio por centro de custo funcionando | `[ ]` |
| 1.3 | F2-003 | Contas financeiras e caixas | Suporte a contas bancarias, caixa fisico e saldos por conta para conciliacao e comparacao com extrato. | F2-001 | Todo lancamento pode ser vinculado a uma conta financeira | `[ ]` |
| 1.4 | F2-004 | Regime caixa x competencia | Cada lancamento passa a ter competencia e liquidacao, permitindo visoes diferentes de resultado. | F2-001 | Filtros e relatorios aceitam visao caixa/competencia | `[ ]` |
| 1.5 | F2-005 | Parcelamento e recorrencia avancada | Parcelamento real (N parcelas, vencimentos) + recorrencia mensal/semanal configuravel com regras de fim. | F2-003 | Lancamento parcelado e recorrente fechado sem retrabalho manual | `[ ]` |
| 1.6 | F2-006 | Anexos e comprovantes | Upload e vinculo de comprovante por lancamento (imagem/pdf) com metadados minimos. | F2-003 | Lancamento exibe e abre comprovante salvo | `[ ]` |
| 2.1 | F2-101 | API publica de lancamentos | Endpoints autenticados para criar/editar/listar lancamentos e categorias para sistemas terceiros. | F2-001, F2-003 | API documentada com contrato estavel | `[ ]` |
| 2.2 | F2-102 | Webhooks de entrada | Endpoint para receber eventos externos (venda, reserva, recebimento, despesa) com idempotencia basica. | F2-101 | Eventos duplicados nao geram lancamento duplicado | `[ ]` |
| 2.3 | F2-103 | Importador CSV/Excel | Wizard de importacao com mapeamento de colunas, preview e validacao antes da confirmacao. | F2-001 | Importacao em lote com relatorio de sucesso/erro | `[ ]` |
| 2.4 | F2-104 | Mapeador universal de origem | Tela para mapear campos de qualquer sistema externo para o modelo financeiro do ChatFinacial. | F2-101, F2-103 | Usuario salva template de mapeamento reutilizavel | `[ ]` |
| 2.5 | F2-105 | Conector base para PDV/hospedagem | Primeiro conector "modelo" com fluxo ponta a ponta para provar integracao setorial sem acoplar o core. | F2-104 | Sincronizacao funcional com logs de execucao | `[ ]` |
| 3.1 | F2-201 | Regras de categorizacao automatica | Motor de regras (por descricao, origem, valor, conta) para sugerir categoria e centro de custo automaticamente. | F2-001, F2-002 | Novos lancamentos entram com classificacao sugerida | `[ ]` |
| 3.2 | F2-202 | Conciliacao bancaria assistida | Conciliar saldo/lancamento com extrato importado e marcar itens conciliados/pendentes. | F2-003, F2-103 | Painel de conciliacao com status por lancamento | `[ ]` |
| 3.3 | F2-203 | Fechamento mensal guiado | Checklist de fechamento (pendencias, futuros, conciliacao, aprovacao) com travas por etapa. | F2-201, F2-202 | Fechamento gera snapshot mensal auditavel | `[ ]` |
| 3.4 | F2-204 | Alertas de anomalia financeira | Alertas para desvio de despesa, queda brusca de receita e saldo projetado negativo. | F2-201 | Alertas aparecem na dashboard e no centro de notificacoes | `[ ]` |
| 4.1 | F2-301 | Multiempresa | Conta principal com varias empresas e troca de contexto sem logout. | F2-001 | Dados isolados por empresa com selecao de contexto | `[ ]` |
| 4.2 | F2-302 | Multiunidade/filiais | Estrutura de unidades por empresa para consolidado e visao comparativa. | F2-301 | Relatorios por unidade e consolidado funcionando | `[ ]` |
| 4.3 | F2-303 | Perfis e permissoes | Perfis (admin, financeiro, consulta) com controle por modulo e acao. | F2-301 | Usuario sem permissao nao executa acao restrita | `[ ]` |
| 4.4 | F2-304 | Trilha de auditoria | Registrar alteracoes criticas (quem, quando, antes/depois) para lancamentos, categorias e configuracoes. | F2-303 | Historico de auditoria consultavel por filtro | `[ ]` |
| 5.1 | F2-401 | Dashboard 2.0 por visao de negocio | Novos paineis: executivo, operacional, fluxo projetado, orcado x realizado, comparativo por unidade. | F2-002, F2-302 | Paineis com filtros por periodo/empresa/unidade | `[ ]` |
| 5.2 | F2-402 | Qualidade de release 2.0.0 | Pipeline de release com testes obrigatorios, build desktop/web, checklist de regressao e changelog de versao. | Todas anteriores criticas | Release 2.0.0 publicada com criterios de qualidade fechados | `[ ]` |
| 5.3 | F2-403 | Documentacao funcional 2.0.0 | Guia de uso por perfil + onboarding de integracao + manual de fechamento mensal. | F2-401 | Material publicado e alinhado com funcionalidades finais | `[ ]` |

## Sequencia recomendada de execucao (pratica)

| Sprint alvo | Itens foco | Resultado esperado |
| --- | --- | --- |
| Sprint 1 | F2-001 ate F2-003 | Base financeira universal operacional |
| Sprint 2 | F2-004 ate F2-006 | Lancamentos completos para operacao real |
| Sprint 3 | F2-101 ate F2-104 | Entrada de dados externos padronizada |
| Sprint 4 | F2-105 + F2-201 | Primeiro fluxo integrado com classificacao automatica |
| Sprint 5 | F2-202 ate F2-204 | Conciliacao, fechamento e alertas |
| Sprint 6 | F2-301 ate F2-304 | Escala multiempresa com governanca |
| Sprint 7 | F2-401 ate F2-403 | Fechamento funcional e release 2.0.0 |

## Criterios de corte de escopo (se prazo apertar)

| Prioridade | Item | Regra de decisao |
| --- | --- | --- |
| Alta | F2-001, F2-002, F2-003, F2-101, F2-103, F2-301, F2-303 | Sem estes, a 2.0.0 perde proposta central |
| Media | F2-104, F2-201, F2-202, F2-401 | Mantem alto valor, mas pode ter escopo reduzido |
| Baixa | F2-105, F2-204, F2-403 | Pode ir para 2.1.0 se prazo/risco exigir |

