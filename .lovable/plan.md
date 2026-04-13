

## Plano: Refatoração Visual Completa — Estilo Netflix com Branding MovieClub

### Visão Geral

Refatorar toda a interface do MovieClubApp com uma experiência visual premium inspirada na Netflix, incorporando a identidade visual do branding (fundo navy escuro `#1B2838`, dourado/creme `#C9A84C`, mascotes dos três macacos). Inclui tela de splash animada antes do login, carrosséis horizontais no estilo Netflix e animações fluidas.

### Mudanças Planejadas

**1. Tela de Splash/Loading (nova)**
- Animação de entrada com o logo "MOVIECLUB" em Cinzel (como na imagem de branding) + estrela de 4 pontas
- Fundo navy escuro com fade-in do texto dourado
- Duração ~2.5s com transição suave para a tela de login
- A splash aparece apenas uma vez ao abrir o app

**2. Tela de Login reformulada**
- Layout fullscreen com background gradient navy
- Logo "MOVIECLUB" centralizado no topo, estilo da imagem de branding
- Subtítulo "SHARED FILM PLATFORM"
- Formulário minimalista com inputs transparentes e bordas sutis
- Botão principal dourado com efeito shimmer
- Animações de entrada escalonadas (stagger)

**3. Carrossel Netflix-style (HomePage)**
- Remover grid atual, implementar carrosséis horizontais com scroll suave
- Hero banner fullscreen no topo com backdrop do filme em destaque (estilo Netflix)
- Cada seção ("Em Alta", "Populares", "Mais Bem Avaliados") como um carrossel horizontal com botões de navegação (setas laterais)
- Cards maiores com efeito hover: scale + preview expandido com título e nota
- Transição suave entre slides

**4. Navbar reformulada**
- Design mais limpo, transparente com blur
- Logo "MOVIECLUB" em Cinzel dourado (sem emoji)
- Itens de navegação: Discover, Perfil, Clubs, Buscar
- Indicador ativo com underline dourado animado

**5. Animações e efeitos globais**
- Transições de página com fade + slide suaves
- Cards com hover scale(1.05) + box-shadow glow sutil
- Skeleton loading com shimmer melhorado
- Scroll-triggered fade-in para seções
- Transição suave de opacidade em imagens ao carregar (lazy load com fade)

**6. Paleta de cores alinhada ao branding**
- Background principal: `#0F1923` (navy profundo)
- Cards: `#162130`
- Dourado primário: `#C9A84C`
- Dourado claro: `#E2C97E`
- Texto principal: `#F0EDE6` (creme claro)
- Bordas: `#1E3347`

### Arquivos Modificados
- `src/components/MovieClubApp.tsx` — refatoração completa de todos os componentes visuais (splash, login, navbar, carrosséis, cards, animações)
- `src/styles.css` — adição de keyframes para novas animações (stagger, shimmer, scale hover, carrossel)

### Detalhes Técnicos
- O carrossel será implementado com CSS scroll-snap + botões de navegação customizados (sem dependência adicional)
- A splash screen usa um state `showSplash` com `setTimeout` para transição automática
- Cards do carrossel usam `transform: scale()` com `transition` CSS para performance (GPU-accelerated)
- Todas as animações usam `will-change` e `transform` para manter 60fps
- As imagens de branding são referência visual apenas — não serão embutidas no código

