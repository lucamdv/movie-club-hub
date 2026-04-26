## Objetivo

Garantir que todas as preferências do usuário sejam realmente aplicadas em Discover, Quick Rate e listas, persistir a visualização (grid/list) e melhorar a UX/validação da tela de Configurações.

## 1. Backend / Foundation

**`src/components/movieclub/foundation.tsx` — `normalizeTmdb`**
- Adicionar campos que hoje não estão expostos: `originalLanguage` (de `original_language`), `genreIds` (de `genre_ids`), e `adult` (de `adult`).
- Manter `runtime` e `genres` como já são (preenchidos quando vêm da rota `/movie/:id` com detalhes).

**Mapa de gêneros PT → ID**
- Criar pequeno objeto estático no `foundation.tsx` (`GENRE_NAME_TO_ID`) mapeando os nomes em português usados na SettingsPage para os IDs do TMDb (Ação=28, Aventura=12, Animação=16, Comédia=35, Crime=80, Documentário=99, Drama=18, Família=10751, Fantasia=14, História=36, Terror=27, Música=10402, Mistério=9648, Romance=10749, Ficção Científica=878, Cinema TV=10770, Thriller=53, Guerra=10752, Faroeste=37).
- Usado para filtrar via `genreIds` quando só temos resultados de listagem (sem `genres` por nome).

## 2. Hooks — aplicação real das preferências

**`src/components/movieclub/hooks.ts`**

Criar helper `applyPreferenceFilters(rawList, preferences, alreadyRatedIds)` que recebe a lista bruta da TMDb e retorna apenas filmes que respeitam:
- `recommendation_min_year` — `release_date` >= ano.
- `recommendation_min_rating` — nota MovieClub (vote_average/2) >= valor.
- `recommendation_max_runtime` — quando `runtime` existir (recomendações da home + similar costumam não ter; por isso o filtro só descarta quando o campo está presente — sem chamar /details em loop).
- `hide_unrated_recommendations` — descarta `vote_count < 50` ou `vote_average == 0`.
- `preferred_languages` (array vazio = todos) — `original_language` deve estar no array.
- `excluded_genres` — converter nomes selecionados para IDs e descartar se algum `genreIds` casar.
- `show_adult_content === false` — descartar `adult === true`.
- Sempre descartar filmes em `alreadyRatedIds` e sem `poster_path`.

Atualizar:
- **`useRecommendations`** — substituir o filtro inline pelo helper. Adicionar todas as novas chaves no array de dependências do `useEffect`.
- Exportar `applyPreferenceFilters` para reaproveitar no Quick Rate.

## 3. Quick Rate

**`src/components/movieclub/pages/QuickRatePage.tsx`**
- Importar `applyPreferenceFilters`.
- Em `loadRandom` e `loadRecommended`, aplicar o helper sobre `unique` / `scoreMap` antes de `setMovies`.
- Usar `preferences.quick_rate_default_mode` para iniciar o modo automaticamente quando o usuário entra (somente uma vez por sessão; não trava se ele trocar manualmente). Mostrar o modo padrão em destaque visual.

## 4. Persistência do `default_view` (grid/list)

Páginas afetadas:
- **`SearchPage.tsx`** — hoje `useState("grid")`.
- **`ProfilePage.tsx` (desktop)** — hoje `useState("list")`.

Mudanças:
- Inicializar `viewMode` com `preferences.default_view ?? "grid"`.
- Resetar (`useEffect`) quando `preferences.default_view` mudar e o usuário ainda não interagiu (flag local `userOverrodeView`).
- Quando o usuário trocar manualmente via `ViewToolbar`, marcar `userOverrodeView=true` para respeitar a escolha da sessão sem voltar para o default.

A persistência real entre reloads vem do banco (`user_preferences.default_view`), já carregado pelo hook `useUserPreferences`.

## 5. SettingsPage — reorganização e UX

**`src/components/movieclub/pages/SettingsPage.tsx`**

### 5.1 Cards colapsáveis na seção Recomendações
- Quebrar a grande seção “Recomendações” em sub-cards colapsáveis, cada um com cabeçalho clicável (ícone, título, breve resumo do valor atual à direita) e chevron animando:
  - **Período & nota** — ano mínimo, nota mínima.
  - **Duração & qualidade** — duração máxima, ocultar sem nota.
  - **Idiomas preferidos** — chips.
  - **Gêneros excluídos** — chips.
- Estado local `openCard` (string|null) controla qual está aberto. Apenas um aberto por vez.
- O resumo no header de cada card mostra o valor compacto (ex.: “≥ 2010 · ≥ 3.5★”, “até 150 min”, “3 idiomas”, “2 gêneros excluídos”).

### 5.2 Resumo em tempo real
- Logo abaixo do header da seção "Recomendações", um card destacado “Pré-visualização do filtro” mostrando em linguagem natural o que será aplicado:
  - Exemplo: “Mostrando filmes de 2010 ou mais recentes, com nota MovieClub ≥ 3.5, até 150 min, em Português ou Inglês, excluindo Terror e Guerra.”
  - Atualiza ao vivo conforme o usuário mexe (usa `form` local).
  - Quando nenhum filtro está ativo: “Sem filtros ativos — todas as recomendações aparecerão.”
- Buscar via TMDb `/discover/movie` com os filtros do form (`primary_release_date.gte`, `vote_average.gte`, `with_runtime.lte`, `with_original_language`, `without_genres`) numa chamada com debounce de 400 ms para mostrar “~ X filmes correspondem”. Cache pelo `apiCache` para não estourar rate limit.

### 5.3 Validação com Zod
- Adicionar `bun add zod` (verificar se já existe).
- Schema:
  - `recommendation_min_year`: opcional; `int().min(1888).max(new Date().getFullYear() + 5)`.
  - `recommendation_min_rating`: `number().min(0).max(5)`.
  - `recommendation_max_runtime`: opcional; `int().min(30).max(600)`.
- Validar em `onChange` (mostra erro inline em vermelho abaixo do campo) e bloquear `Salvar` se houver erros.
- Os botões já desabilitam quando `!dirty`; agora também quando `errors !== {}`.
- Mensagens de erro claras em português, ex.: “Use um ano entre 1888 e 2030”, “A duração deve estar entre 30 e 600 minutos”.

### 5.4 Outros ajustes
- Remover ícones não usados (`Calendar`, `PlayCircle`, etc.) que ficaram do refactor anterior, conforme necessário.
- Manter as outras seções (Aparência, Conteúdo, Quick Rate, Streaming, Privacidade, Notificações) como estão hoje.

## 6. Arquivos editados

- `src/components/movieclub/foundation.tsx` — adicionar campos no normalizer + mapa de gêneros.
- `src/components/movieclub/hooks.ts` — helper `applyPreferenceFilters`, atualizar `useRecommendations`.
- `src/components/movieclub/pages/QuickRatePage.tsx` — usar helper + modo padrão.
- `src/components/movieclub/pages/SearchPage.tsx` — inicializar `viewMode` com preferência.
- `src/components/movieclub/pages/ProfilePage.tsx` — idem (desktop).
- `src/components/movieclub/pages/SettingsPage.tsx` — cards colapsáveis, resumo dinâmico, validação Zod.
- `package.json` — `zod` (se ainda não estiver).

## 7. Resultado esperado

- Discover (carrossel “Recomendados para Você”) e Quick Rate respeitam **todas** as preferências instantaneamente após salvar.
- Search e Profile abrem na visualização escolhida e mantêm-na após reload.
- Tela de Configurações fica organizada, com cards colapsáveis na seção mais densa, mostra ao vivo o efeito do filtro e impede salvar valores inválidos com mensagens claras.
