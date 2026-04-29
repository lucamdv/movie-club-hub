Vou refazer o sistema visual dos modais mobile para parar de depender do posicionamento anterior que está empurrando o topo para fora da tela.

Plano:

1. Corrigir a raiz do desalinhamento
- Ajustar o `useBodyScrollLock` para não deixar o `body` fixo com offset interferir no posicionamento dos modais renderizados dentro da página.
- Manter o bloqueio de scroll e restauração da posição, mas evitar que o modal herde deslocamentos visuais indevidos.

2. Refazer o CSS dos modais `.mc-modal-*`
- No mobile, o overlay será `fixed inset: 0`, com `width: 100vw`, `height: 100dvh`, `z-index` alto e sem transform/offset.
- O painel ocupará a tela visível inteira, alinhado em `top: 0`, respeitando safe-area de notch e home indicator.
- Header e footer ficarão fixos dentro do painel; apenas `.mc-modal-body` terá scroll.
- Remover regras conflitantes que podem gerar dupla rolagem, topo cortado ou centralização errada.

3. Padronizar bottom sheets existentes
- Ajustar `.bottom-sheet` e `.bottom-sheet-overlay` para o mesmo padrão de viewport mobile.
- Garantir que avaliação de filme e settings mobile não fiquem atrás da topbar/navbar nem criem duas scrollbars.

4. Revisar os modais dos Clubs
- Aplicar o padrão corrigido nos modais de adicionar filme, convidar amigos, marcar como visto e sair/excluir club.
- Garantir que botões de fechar, cabeçalho e ações fiquem sempre visíveis no mobile.

5. Validação mobile
- Conferir no viewport atual de 411x764 que o modal começa exatamente no topo visível, ocupa 100% da tela mobile e rola só no conteúdo interno.
- Verificar que topbar e bottom nav ficam ocultas enquanto o modal está aberto.