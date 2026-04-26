-- Adicionar novas colunas de preferências do usuário
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS default_view text NOT NULL DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS hide_unrated_recommendations boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_languages text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS excluded_genres text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS streaming_region text NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS quick_rate_default_mode text NOT NULL DEFAULT 'random',
  ADD COLUMN IF NOT EXISTS auto_play_trailers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hide_spoilers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compact_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendation_max_runtime integer,
  ADD COLUMN IF NOT EXISTS show_adult_content boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS notify_friend_activity boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_club_activity boolean NOT NULL DEFAULT true;