# Contexto Oficial do Projeto

## Objetivo

Aplicacao desktop/web para gestao financeira com autenticacao, dashboard executiva, relatorio com CRUD de transacoes, calendario mensal e exportacao de relatorio em PDF no desktop (Electron).

## Stack atual

- React 19 + Vite + TypeScript
- React Router DOM
- Supabase (Auth + tabela `transactions` + tabela `transaction_categories`)
- CSS Modules
- Electron (shell desktop + IPC para exportacao de PDF)
- Jest + Testing Library

## Estrutura principal

- `src/main.tsx`: bootstrap React, tema inicial, registro PWA.
- `src/App.tsx`: compoe `AppProviders` + `RouterMain`.
- `src/contexts/AuthContext.tsx`: sessao/autenticacao.
- `src/routes/routerConfig.tsx`: definicao de rotas.
- `src/components/Layout/*` + `src/components/layouts/AppLayout/*`: shell geral.
- `src/components/Navbar/*`: navegacao e acoes globais.
- `src/pages/Dashboard/*`: dashboard executiva completa.
- `src/pages/Report/*`: relatorio, CRUD e exportacao.
- `src/pages/Calendario/*`: visao mensal com agregacoes.
- `src/services/finance.service.ts`: CRUD financeiro + categorias + exportacao.
- `src/services/business.service.ts`: configuracoes da empresa.
- `src/lib/supabase.ts`: client Supabase.
- `electron/main.ts`: janela desktop + handler PDF.
- `electron/preload.ts`: API segura `window.api`.
- `supabase/migrations/20260227_create_transaction_categories.sql`: migracao de categorias.

## Rotas atuais

- `/` -> redireciona para `/dashboard` (autenticado) ou `/login`.
- `/login` -> publica.
- `/dashboard` -> protegida (renderiza `Formulario`, que encapsula `Dashboard`).
- `/report` -> protegida.
- `/calendario` -> protegida.

## Fluxo de usuario (fim a fim)

1. Usuario abre app.
2. AuthContext consulta sessao no Supabase.
3. Router redireciona para login ou dashboard.
4. Usuario autenticado navega pela sidebar (`Dashboard`, `Report`, `Calendario`).
5. Usuario pode:
- analisar indicadores no dashboard;
- ocultar/exibir valores sensiveis no dashboard (icone de olho);
- criar/editar/excluir transacoes no report;
- gerenciar categorias no modal dedicado;
- filtrar por periodo no report/calendario;
- acompanhar separadamente lancamentos futuros no report;
- exportar PDF no report com formulario de exportacao;
- atualizar configuracoes da conta/empresa no modal da navbar.
6. Em desktop, exportacao chama IPC e Electron gera PDF com layout customizado.
7. Logout encerra sessao e retorna ao fluxo de login.

## Dashboard (estado atual)

Arquivo principal: `src/pages/Dashboard/Dashboard.tsx`

Recursos:

- filtros por modo (anual/mensal), ano e mes;
- modo padrao: mensal no mes atual;
- cards executivos (receita, despesa, lucro, margem, variacao);
- card de lucro liquido considera somente lancamentos com data <= hoje;
- grafico de vela;
- evolucao de lucro (12 meses);
- comparativo receita vs despesa;
- indicadores de saude;
- secao ROI/acumulado com suporte a configuracao da empresa;
- tendencia/direcao;
- toggle de privacidade com icone de olho (mostrar/ocultar valores);
- painel de ajuda flutuante (`?`) dentro da dashboard, arrastavel no desktop.

Dependencias:

- `financeService.getTransactions()`
- `businessService.getBusinessSettings()`

## Report (estado atual)

Arquivo principal: `src/pages/Report/Report.tsx`

### CRUD de transacoes

- CREATE: modal "Nova transacao".
- READ: listas de entradas/saidas ate hoje + listas separadas de entradas/saidas futuras.
- UPDATE: edicao inline nas tabelas/cards.
- DELETE: remocao de transacao.

Regras atuais importantes:

- filtro padrao abre no ano/mes atual (em vez de "todos");
- categoria na criacao: apenas selecao de categoria existente;
- categoria na edicao: `select` com categorias cadastradas por tipo (`entrada`/`saida`);
- custos mensais aplicados conforme regras de recorrencia existentes.
- ultimo lancamento de entrada e saida exibido no topo da lista (baseado na data real de `date`, nao na data de cadastro).
- transacoes com `date > hoje` sao exibidas em secoes proprias:
  - `Entradas futuras`
  - `Saidas futuras`

### Gestao de categorias

Modal dedicado "Gerenciar categorias":

- lista de categorias por tipo;
- criar categoria (botao superior);
- editar categoria por item;
- apagar categoria por item;
- lista com altura fixa + scroll interno.

### Exportacao de PDF

Fluxo atual:

- clicar em "Exportar relatorio" abre modal de exportacao;
- formulario de exportacao:
  - nome do arquivo;
  - tipo de periodo (`Ano`, `Mes`, `Dia`);
  - seletores de ano/mes/dia conforme tipo;
- ao gerar:
  - payload inclui nome de arquivo, nome da empresa, data de criacao, periodo, entradas, saidas, totais, resultado e mini tabela dashboard.

## Calendario

Arquivo: `src/pages/Calendario/Calendario.tsx`

Recursos:

- leitura de transacoes;
- agregacao por dia (entradas/saidas);
- navegacao mensal;
- filtro por ano;
- inclui recorrencia de custos mensais (`isMonthlyCost`) conforme regras de negocio.

## Servicos

## `finance.service.ts`

Funcoes principais:

- `saveTransaction`
- `getTransactions`
- `updateTransaction`
- `deleteTransaction`
- `getCategoryItems`
- `getCategories`
- `saveCategory`
- `updateCategory`
- `deleteCategory`
- `exportReportPdf`

Observacoes:

- `getTransactions` retorna ordenado por data desc no Supabase;
- para PDF, ordenacao crescente (mais antiga -> mais recente) e aplicada antes de renderizar.

## `business.service.ts`

Gerencia configuracoes empresariais usadas no dashboard (inclui base de investimento para ROI).

## Supabase (modelo atual)

### Tabela existente

- `transactions`

### Nova tabela

- `transaction_categories`
  - `id`
  - `user_id`
  - `type` (`entrada`/`saida`)
  - `name`
  - `name_normalized` (gerada)
  - `created_at`
  - `updated_at`

### Funcao SQL

- `ensure_transaction_category(p_name, p_type)`

### Seguranca

- RLS habilitada em `transaction_categories` com politicas por usuario.

Migracao oficial:

- `supabase/migrations/20260227_create_transaction_categories.sql`

## Electron (desktop)

### `electron/preload.ts`

Expose:

- `window.api.exportReportPdf(payload)`

### `electron/main.ts`

Handler:

- `ipcMain.handle('finance:exportReportPdf', ...)`

Fluxo:

1. abre dialogo nativo "Salvar PDF";
2. usuario escolhe local e nome;
3. gera HTML com tema visual do sistema;
4. renderiza PDF via `printToPDF`;
5. salva no caminho escolhido;
6. retorna `filePath` no sucesso.

Conteudo do PDF:

- cabecalho com arquivo, empresa, data criacao e periodo;
- resumo (entradas, saidas, resultado);
- tabela de entradas (ordenada crescente por data) + soma;
- tabela de saidas (ordenada crescente por data) + soma;
- mini tabela de indicadores da dashboard;
- resultado final.

## Tema, UX e componentes globais

- tema `light/dark` persistido via `localStorage`.
- `ModalBase`:
  - fecha com ESC;
  - fecha no overlay;
  - bloqueia scroll do body enquanto aberto.

## Scripts principais

- `npm run dev` -> web + build watch electron + app desktop.
- `npm run build` -> build web.
- `npm run build:electron` -> compila processo Electron.
- `npm run electron:build` -> pacote desktop.
- `npm run test` -> testes.

## Observacoes operacionais importantes

- Mudancas em `electron/main.ts` exigem reiniciar o processo Electron.
- `npm run build` nao compila `dist-electron`; para validar processo desktop use `npm run build:electron`.
- Supabase nao participa da escrita do PDF (PDF e local no desktop).

## Memoria oficial

Este `context.md` deve ser atualizado sempre que houver mudanca de:

- fluxo de usuario;
- contratos de servico/IPC;
- rotas e componentes principais;
- regras de negocio (dashboard, report, calendario);
- esquema ou migracoes no Supabase.
