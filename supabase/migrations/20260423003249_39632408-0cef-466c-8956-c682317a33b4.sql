-- Backfill broken legacy avatar paths (Vite hashed assets) into stable tokens
-- so they resolve correctly in the UI even after a new build.
UPDATE public.profiles
SET avatar_url = CASE
  WHEN avatar_url ~ '^/assets/mascot-wizard-'    THEN 'monkey:mascot-wizard'
  WHEN avatar_url ~ '^/assets/mascot-speak-'     THEN 'monkey:mascot-speak'
  WHEN avatar_url ~ '^/assets/mascot-see-'       THEN 'monkey:mascot-see'
  WHEN avatar_url ~ '^/assets/monkey-director-'  THEN 'monkey:director'
  WHEN avatar_url ~ '^/assets/monkey-popcorn-'   THEN 'monkey:popcorn'
  WHEN avatar_url ~ '^/assets/monkey-detective-' THEN 'monkey:detective'
  WHEN avatar_url ~ '^/assets/monkey-star-'      THEN 'monkey:star'
  WHEN avatar_url ~ '^/assets/monkey-astronaut-' THEN 'monkey:astronaut'
  WHEN avatar_url ~ '^/assets/monkey-strong-'    THEN 'monkey:strong'
  WHEN avatar_url ~ '^/assets/monkey-shy-'       THEN 'monkey:shy'
  WHEN avatar_url ~ '^/assets/monkey-gym-'       THEN 'monkey:gym'
  WHEN avatar_url ~ '^/assets/monkey-ears-'      THEN 'monkey:ears'
  WHEN avatar_url ~ '^/assets/monkey-flash-'     THEN 'monkey:flash'
  WHEN avatar_url ~ '^/assets/monkey-crew-'      THEN 'monkey:crew'
  WHEN avatar_url ~ '^/assets/monkey-search-'    THEN 'monkey:search'
  ELSE avatar_url
END
WHERE avatar_url LIKE '/assets/%';