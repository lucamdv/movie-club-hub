
Objetivo: corrigir de forma definitiva o scroll vertical da tela Discover no mobile, para que o usuário consiga subir/descer a página mesmo iniciando o gesto em cima de qualquer carrossel.

1. Corrigir a causa principal no carrossel reutilizável
- Ajustar o componente `Carousel` em `src/components/movieclub/ui.tsx`, porque ele é a base de todos os trilhos da Discover.
- Implementar detecção de direção do gesto (`touchstart`/`touchmove`/`touchend` ou pointer equivalente):
  - se o movimento começar predominantemente na vertical, o carrossel entra em modo “vertical gesture” e para de disputar o gesto com a página;
  - se o movimento começar predominantemente na horizontal, o carrossel continua funcionando normalmente para passar os filmes.
- Isso evita depender só de CSS, que hoje não está resolvendo o problema de forma confiável no mobile.

2. Remover o comportamento CSS que ainda está prendendo o scroll
- Revisar `src/styles.css` e limpar as regras duplicadas da `.carousel-row`.
- Remover o bloqueio vertical atual (`overscroll-behavior-y: none`) do carrossel, porque ele atrapalha o encadeamento do scroll da página.
- Manter apenas o isolamento horizontal necessário (`overscroll-behavior-x: contain`) e simplificar `scroll-snap` para não “puxar” o gesto errado.

3. Aplicar estado visual/comportamental por gesto
- Adicionar uma classe ou `data-attribute` temporário no carrossel durante o gesto:
  - `data-gesture="vertical"`: desativa momentaneamente o snap horizontal e reduz a interferência do trilho;
  - `data-gesture="horizontal"`: mantém swipe lateral fluido.
- Isso garante compatibilidade tanto nos carrosséis normais quanto no Top 10, já que ambos passam pelo mesmo `Carousel`.

4. Preservar clique e swipe horizontal
- Garantir que tocar num cartaz continue abrindo o filme.
- Garantir que arrastar lateralmente continue passando os posters.
- Evitar regressões em desktop: o comportamento novo fica restrito a touch/mobile, sem afetar hover, botões laterais e animações da versão web.

5. Validar o fluxo mobile real
- Testar especificamente no viewport mobile atual (~411px):
  - deslize vertical iniciado sobre cartaz/poster;
  - deslize vertical iniciado sobre gaps do carrossel;
  - swipe horizontal intencional para trocar filmes;
  - clique simples no poster.
- Confirmar que a página não fica “presa” ao tocar no carrossel e que não surge novo desalinhamento lateral.

Arquivos previstos
- `src/components/movieclub/ui.tsx` — lógica de gesto do `Carousel`
- `src/styles.css` — limpeza e ajuste das regras de `.carousel-row`

Resultado esperado
- Na Discover mobile, o usuário poderá rolar a página normalmente mesmo começando o toque em cima dos carrosséis.
- O swipe horizontal continuará funcionando apenas quando o gesto for claramente lateral.
- A correção valerá para todos os carrosséis reutilizados da home/discover, não só para um bloco isolado.
