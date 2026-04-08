# ChatFinacial Mobile PWA

Projeto mobile-first independente montado dentro de `PWA/`, baseado no projeto principal `chatFinacial`.

## O que foi reaproveitado

- Auth e client Supabase
- Servicos financeiros e de negocio
- Dashboard e Calendario
- Design system CSS Modules e tema global
- Pasta `supabase/` com migrations

## O que foi adaptado

- Roteamento principal para:
  - `/chat`
  - `/dashboard`
  - `/calendario`
- Navegacao mobile com bottom nav
- Nova tela `Chat` para CRUD por linguagem natural (entrada/saida, editar, apagar, listar, resumo)
- Remocao de dependencias Electron para build web/PWA standalone

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Variaveis de ambiente

Crie `.env` a partir de `.env.example` e use os mesmos valores do projeto original:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (fallback)

## Estrategia para mover para outro repositorio

Copie toda a pasta `PWA/` para a raiz do novo repositorio e execute `npm install`.
