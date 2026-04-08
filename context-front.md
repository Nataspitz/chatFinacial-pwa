Contexto de Programacao - Front-End
Visao Geral
O desenvolvedor constroi SPAs com React 18 e Vite, priorizando uma camada de roteamento enxuta e providers de contexto para encapsular regras de negocio. Alterna entre JavaScript e TypeScript conforme a maturidade do projeto, mantendo padroes de organizacao e de feedback ao usuario (toast, loadings) constantes. A escolha de bibliotecas de UI segue o mesmo principio pragmatista: Chakra UI quando ha necessidade de um design system rico e Styled Components quando o foco e controle pixel a pixel.

Estrutura de Pastas
Todos os projetos partem de src/ dividido em camadas previsiveis (components, pages, routes, services, styles, assets). Componentes de UI sao quebrados por funcao (sections, containers, forms, cards, menus), enquanto features transversais ficam em contexts, hooks, utils ou constants. Os estilos vivem ao lado dos componentes (arquivos Style*.ts(x) ou temas do Chakra) e ha sempre um RouterMain central. Assets estaticos ficam em uma pasta unica; dados mockados (como projects.ts) ficam na raiz de src para consumo direto.

Padroes Arquiteturais
A arquitetura e modular orientada a composicao de componentes. As paginas funcionam como orquestradores finos que apenas agrupam secoes, delegando comportamento aos componentes filhos e a providers. A protecao de rotas usa layouts com Outlet. Contextos (AuthContext, ApostilleContext, UserContext) concentram efeitos, chamadas HTTP e persistencia em localStorage, aproximando-se de um pattern service + provider.

Tecnologias e Ferramentas
React 18 + Vite como base de construcao e bundling.
React Router DOM v6 para navegacao declarativa.
Styled Components (v5 e v6) com createGlobalStyle e tokens CSS; Chakra UI + next-themes para theming responsivo.
React Hook Form + Zod (zodResolver) para formularios tipados e validacao declarativa.
Axios centralizado em services/api com leitura de import.meta.env nos projetos em TypeScript.
React Toastify para feedback, React Icons/FontAwesome para icones, DnD Kit, Framer Motion e React Spring para interacoes pontuais.
Convencoes de Codigo
Componentes e pastas seguem PascalCase; helpers e hooks usam camelCase. Cada componente exporta por default quando isolado e por export nomeado quando faz parte de um agrupamento maior. Os estilos criados com Styled Components recebem prefixo Style e sao importados diretamente do componente. O TypeScript utiliza interfaces dedicadas em subpastas (contexts/interfaces) e infere tipos via z.infer. Ha padrao de imports relativos curtos, com extensao explicita quando exigido pelo Vite (import App from "./App.tsx"). Chamadas HTTP usam async/await e tratamento de erros via toast.

Organizacao de Componentes e Estado
App monta apenas os wrappers globais (GlobalStyle ou Provider) e delega rotas a RouterMain. Cada pagina monta secoes com componentes especializados (listas, modais, formularios). O estado global vive em Context API, combinando useState, useEffect e localStorage para sessao do usuario e caches. Formulario complexo fica sob react-hook-form, garantindo controle de erros via objeto errors. Estados visuais (abre/fecha menu, card ativo em DnD) residem no componente com hooks customizados quando necessario (useKanbanDnD, useDragScroll).

Comunicacao com o Back-End
Existe sempre um cliente Axios unico (api) com configuracao de baseURL e headers padrao; em ambiente corporativo e lido via env (VITE_API_URL_DEV/PROD). Contextos chamam esse cliente, persistem tokens (@TOKEN, @REFRESH) e redirecionam com useNavigate. Erros resultam em toast.error, sucessos em toast.success, e ha controle de loading com estados booleanos expostos pelo provider. Endpoints privados enviam Authorization: Bearer ${token} diretamente do contexto.

Estilizacao e Layout
Reset global e tokens de cores sao declarados via createGlobalStyle (Styled Components) ou Chakra createSystem, garantindo consistencia de tipografia (Inter como fonte padrao) e de paletas. Os componentes estilizados seguem abordagem mobile-first com media queries em breakpoints chave (768px, 1024px). No Chakra, props responsivas (mt, gap, maxW) regulam spacing. Ha uso recorrente de CSS variables (--color-primary, --grey-4) e de temas customizados para light/dark mode.

Filosofia e Principios
Prioriza modularidade, reutilizacao e feedback imediato ao usuario. A camada de UI e pensada para ser declarativa e consistente (tokens, componentes de layout reutilizaveis), enquanto regras de negocio sao centralizadas em contextos. Ha cuidado com acessibilidade basica (botao com cursor: pointer, inputs com labels) e com responsividade. O desenvolvedor adota bibliotecas quando aceleram entrega, mas mantem controle sobre estrutura e estados para previsibilidade.

Padroes Repetidos e Boas Praticas
ToastContainer montado em App para feedback global.
RouterMain dedicado ao mapa de rotas, com wrappers de contexto.
services/api unico e reutilizado, separando configuracao HTTP.
Formularios com react-hook-form + zod para validacao.
Estilos isolados em arquivos Style* ou tema Chakra centralizado.
Persistencia de tokens no localStorage e protecao de rotas via layout privado.
Estruturacao de componentes por funcao (containers, sections, cards, modals).
Sugestao de Template Base
src/
  assets/
  components/
    containers/
    sections/
    forms/
    ui/
  contexts/
    interfaces/
  hooks/
  pages/
  routes/
  services/
  styles/
  utils/
  App.tsx
  main.tsx
.env.example
Replique App montando GlobalStyle, providers (Chakra ou ThemeProvider) e RouterMain. No services/api, exporte um Axios configurado com envs VITE_API_URL_*. Crie contextos para dominio (Auth, Feature) expondo estado, loading, mutations e efeitos de bootstrap. Garanta um GlobalStyle ou tema com tokens reutilizados nos componentes Style* e mantenha as paginas atuando apenas como agregadores de secoes.