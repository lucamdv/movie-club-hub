

# Refatoração: Quebrar MovieClubApp.tsx (10.492 linhas) em Módulos

## Estratégia: Refatoração Conservadora

O arquivo atual usa `// @ts-nocheck`, escopo compartilhado entre dezenas de componentes (todos referenciam `C`, `tmdb`, `omdb`, `streaming`, hooks, ícones SVG inline) e tem zero testes. Para garantir **zero regressão**, vou:

1. Mover blocos para arquivos dedicados **mantendo as mesmas assinaturas e exports nomeados**.
2. O `MovieClubApp.tsx` se torna apenas um orquestrador (~250 linhas) que importa tudo.
3. Manter `// @ts-nocheck` em todos os arquivos novos (igual ao atual) para evitar quebras de tipagem.
4. Não alterar nenhuma lógica, JSX ou comportamento — apenas mover código.

## Estrutura Proposta

```text
src/
├── components/
│   ├── MovieClubApp.tsx              (orquestrador — ~250 linhas)
│   └── movieclub/
│       ├── tokens.ts                 C, MONKEY_AVATARS, STREAM_META, mocks (~400 linhas)
│       ├── icons.tsx                 Todos os ícones SVG inline (~300 linhas)
│       ├── api/
│       │   ├── cache.ts              apiCache, normalizeTmdb, mergeOmdb, parseStreamingServices
│       │   └── clients.ts            tmdb, omdb, streaming objects
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useRatings.ts
│       │   ├── useWatchlist.ts
│       │   ├── useMovieDetails.ts
│       │   ├── usePaginatedMovies.ts
│       │   ├── useRecommendations.ts
│       │   ├── useFollows.ts
│       │   ├── useFriendLinks.ts
│       │   ├── useFriendships.ts
│       │   ├── useClubs.ts
│       │   └── useClubDetail.ts
│       ├── ui/                       Componentes atômicos reutilizáveis
│       │   ├── Spinner.tsx
│       │   ├── SkeletonCard.tsx
│       │   ├── StarRating.tsx
│       │   ├── Avatar.tsx
│       │   ├── Badge.tsx
│       │   ├── Btn.tsx
│       │   ├── TextInput.tsx
│       │   ├── Section.tsx
│       │   ├── FilmStripBg.tsx
│       │   ├── StreamingBadges.tsx
│       │   ├── RatingsRow.tsx
│       │   ├── MovieCard.tsx
│       │   ├── MiniPoster.tsx
│       │   ├── ViewToolbar.tsx
│       │   ├── Carousel.tsx
│       │   ├── PaginationBar.tsx
│       │   ├── HeroBanner.tsx
│       │   └── Top10Card.tsx
│       ├── layout/
│       │   ├── Navbar.tsx
│       │   └── SplashScreen.tsx
│       ├── modals/
│       │   ├── ImportDataModal.tsx
│       │   └── ProfileEditModal.tsx
│       ├── utils.ts                  isUpcoming, formatReleaseDateBR
│       └── pages/
│           ├── HomePage.tsx
│           ├── MoviePage.tsx
│           ├── SearchPage.tsx
│           ├── ProfilePage.tsx
│           ├── FriendsPage.tsx
│           ├── GroupsPage.tsx
│           ├── GroupPage.tsx
│           ├── QuickRatePage.tsx
│           ├── SettingsPage.tsx
│           └── LoginPage.tsx
```

## Como Garantir Zero Regressão

- **Mesmas assinaturas**: cada função/componente exportada com a mesma forma usada hoje (`export function HomePage(...)`, etc.).
- **Imports cruzados explícitos**: cada arquivo importa apenas o que precisa de `tokens`, `icons`, `api`, `hooks`, `ui`.
- **Manter `// @ts-nocheck`** no topo de cada arquivo novo (o original já usa) para preservar comportamento dinâmico.
- **Sem renomear nada**: `C`, `tmdb`, `omdb`, `streaming` continuam com os mesmos nomes.
- **Build incremental**: executar `npm run build` (ou `vite build`) após a refatoração para validar.

## Ordem de Execução (uma única passada)

1. Criar `tokens.ts`, `icons.tsx`, `utils.ts`, `api/cache.ts`, `api/clients.ts`.
2. Criar todos os hooks em `hooks/`.
3. Criar todos os componentes UI em `ui/`.
4. Criar `layout/`, `modals/`, `pages/`.
5. Reescrever `MovieClubApp.tsx` enxuto importando tudo.
6. Validar build e abrir preview para checagem visual.

## Riscos & Mitigação

- **Risco**: dependências circulares (ex: `MovieCard` usa `StarRating` que usa `C`).  
  **Mitigação**: hierarquia clara — `tokens` → `icons`/`utils` → `api` → `hooks` → `ui` → `modals`/`layout` → `pages` → `MovieClubApp`.
- **Risco**: hook `useAuth` é usado em vários lugares.  
  **Mitigação**: continua sendo um hook exportado, importado onde necessário (sem mudar lógica de sessão recente).
- **Risco**: componentes acessam variáveis no closure (ex: ícones que usam `C`).  
  **Mitigação**: cada arquivo importa `C` de `tokens.ts`.

## Arquivos Alterados/Criados

- **Criar**: ~40 novos arquivos sob `src/components/movieclub/`.
- **Reescrever**: `src/components/MovieClubApp.tsx` (de 10.492 → ~250 linhas).
- **Não tocar**: `src/routes/index.tsx` (continua importando `MovieClubApp` default), `src/lib/movie-api.*`, tipos Supabase, rotas, configs.

