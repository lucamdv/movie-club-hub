

## Plano: Responsividade Mobile + Fix Visualização de Notas no Perfil

### 1. Bug das estrelas no Perfil (mini-cards de avaliações)
**Arquivo**: `src/components/movieclub/pages/ProfilePage.tsx` linha 1516.

Atualmente exibe `Number(r.rating).toFixed(0)` — isso **arredonda 3.5 para "4"** e 2.5 para "3". O badge mostra um único número sobre a estrela.

**Correção**: trocar por `Number(r.rating).toFixed(1)` para mostrar sempre uma casa decimal (`3.5`, `4.0`, `2.5`). Aumentar levemente o `padding`/`fontSize` do badge (de 10px → 11px e padding `2px 7px`) para acomodar 3 caracteres sem cortar visualmente.

### 2. Fix runtime: `window is not defined` no SSR
**Arquivo**: `src/components/MovieClubApp.tsx` linha 90.

O hook `useIsMobile` lê `window.innerWidth` no estado inicial, quebrando renderização server-side. Já existe um `useIsMobile` SSR-safe em `src/hooks/use-mobile.tsx` — vou alinhar:
- Inicializar com `false` (ou `undefined`) no `useState`.
- Mover a leitura de `window.matchMedia` para dentro do `useEffect`.

Mesmo padrão para o `useEffect` no `ProfilePage` linha 2725 (já está dentro de `useEffect`, ok) — mas o `useState(window.innerWidth <= 768)` na linha de inicialização precisa virar `useState(false)` com leitura dentro do effect. Verificarei e corrigirei se necessário.

### 3. Responsividade Mobile Geral

**Princípios**:
- Substituir `100vh` por `100dvh` em todos os pages (evita rolagem fantasma causada pela barra do navegador mobile que comprime/expande). Arquivos: `ProfilePage.tsx`, `MoviePage.tsx`, `QuickRatePage.tsx`.
- Garantir `overflow-x: hidden` no container raiz do app para nunca permitir scroll horizontal acidental.
- Garantir que páginas de "single screen" (login, splash, telas de loading) ocupem exatamente `100dvh` sem permitir overscroll vertical.

**Carrosséis** (`src/styles.css` `.carousel-row`):
- Já tem `scroll-snap-type: x mandatory` e `-webkit-overflow-scrolling: touch`. Vou adicionar `overscroll-behavior-y: none` para evitar puxar conteúdo da página enquanto faz scroll horizontal.

**Modais / Bottom Sheets** (`src/styles.css` `.bottom-sheet`):
- Trocar `max-height: 90dvh` por `max-height: calc(100dvh - var(--safe-top) - 24px)` para nunca ultrapassar a tela visível.
- Garantir `overflow-y: auto` com `-webkit-overflow-scrolling: touch` (já tem).
- Adicionar `overscroll-behavior: contain` para não vazar scroll para o body.

**HomePage** (`src/components/movieclub/pages/HomePage.tsx`):
- Já usa `overflow-x-hidden` no container — manter.
- Verificar margem dos skeletons no mobile (já usa `-ml-4`).

**ProfilePage Mobile** (linha 2725, já tem detecção `isMobile`):
- O return mobile usa `paddingTop: 64`. Trocar por `paddingTop: calc(var(--top-bar-height) + var(--safe-top))` para não esconder conteúdo sob a top bar dinâmica.
- Trocar `paddingBottom: 80` por `calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)`.

**MoviePage Mobile**:
- `.movie-hero { height: 280px }` está ok. Adicionar `max-height: 50dvh` para telas muito baixas.
- Garantir que carrosséis "Similares" e "Elenco" não causem scroll horizontal na página (eles já têm `overflowX: auto` em containers com margem negativa — manter, mas adicionar `overflow-x: hidden` no parent imediato).

**QuickRatePage**:
- Trocar `100vh` por `100dvh` (4 ocorrências).
- A página é uma "single screen" (swipe Tinder) — adicionar `overflow: hidden` no container raiz para impedir rolagem da página.

**SearchPage**:
- Grid mobile já está em `repeat(auto-fill, minmax(100px, 1fr))`. OK.
- Garantir que filtros (chips) façam scroll horizontal sem quebrar layout.

**FriendsPage**:
- Tabs já fazem `overflowX: auto`. Adicionar fade nas bordas (opcional, mantenho conservador — só garanto que `scrollbar-width: none` esteja aplicado).

**GroupPage**:
- Verificar `WatchRateModal` (recém-criado) — garantir que use `.bottom-sheet` ou tenha `max-height` mobile-safe.

### 4. Resumo das Edições

| Arquivo | Alteração |
|---|---|
| `src/components/movieclub/pages/ProfilePage.tsx` | Linha 1516: `toFixed(0)` → `toFixed(1)` + ajuste de padding/fontSize do badge. Trocar `100vh` por `100dvh`. Ajustar paddings mobile com safe-area vars. |
| `src/components/MovieClubApp.tsx` | Fix `useIsMobile` SSR-safe (window dentro de useEffect). |
| `src/components/movieclub/pages/QuickRatePage.tsx` | `100vh` → `100dvh` (4x). Adicionar `overflow: hidden` no root. |
| `src/components/movieclub/pages/MoviePage.tsx` | `100vh` → `100dvh`. |
| `src/components/movieclub/pages/GroupPage.tsx` | Garantir que `WatchRateModal` respeite safe-area no mobile. |
| `src/styles.css` | `.bottom-sheet` max-height usando `dvh` + safe-area; `.carousel-row` `overscroll-behavior-y: none`; container raiz `overflow-x: hidden`. |

### 5. Riscos & Mitigação

- **Risco**: `100dvh` não é suportado em browsers muito antigos. **Mitigação**: já está em uso em outras partes (`min-height: 100dvh` no body) — sem regressão.
- **Risco**: alterar padding mobile do Profile pode impactar visual. **Mitigação**: usa as mesmas CSS variables já definidas em `:root`.
- **Risco**: badge de estrela com 3 caracteres (ex: "3.5") pode ficar apertado. **Mitigação**: aumento controlado de `padding` e `fontSize` (testado visualmente no preview após edição).

