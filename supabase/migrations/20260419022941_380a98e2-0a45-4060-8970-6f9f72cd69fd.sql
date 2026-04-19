
CREATE TABLE public.club_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT,
  poster_url TEXT,
  rating NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_club_activity_club_created ON public.club_activity (club_id, created_at DESC);
CREATE INDEX idx_club_activity_user ON public.club_activity (user_id);

ALTER TABLE public.club_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view club activity"
  ON public.club_activity
  FOR SELECT
  TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Members can log their own activity"
  ON public.club_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Users can update their own activity"
  ON public.club_activity
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity"
  ON public.club_activity
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
