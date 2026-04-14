CREATE UNIQUE INDEX IF NOT EXISTS ratings_user_tmdb_unique ON public.ratings (user_id, tmdb_id);
ALTER TABLE public.ratings ADD CONSTRAINT ratings_user_tmdb_unique UNIQUE USING INDEX ratings_user_tmdb_unique;

CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_tmdb_unique ON public.watchlist (user_id, tmdb_id);
ALTER TABLE public.watchlist ADD CONSTRAINT watchlist_user_tmdb_unique UNIQUE USING INDEX watchlist_user_tmdb_unique;