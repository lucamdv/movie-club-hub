-- Clubs table
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Club members table
CREATE TABLE public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member', -- 'owner' or 'member'
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Club invites table
CREATE TABLE public.club_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, invited_user_id)
);

ALTER TABLE public.club_invites ENABLE ROW LEVEL SECURITY;

-- Club movies table
CREATE TABLE public.club_movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tmdb_id integer NOT NULL,
  title text,
  poster_url text,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_id, tmdb_id, user_id)
);

ALTER TABLE public.club_movies ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a club member
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id AND club_id = _club_id
  )
$$;

-- CLUBS policies
CREATE POLICY "Members can view their clubs" ON public.clubs
  FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), id));

CREATE POLICY "Anyone can view club by invite code" ON public.clubs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create clubs" ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update club" ON public.clubs
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete club" ON public.clubs
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- CLUB_MEMBERS policies
CREATE POLICY "Members can view club members" ON public.club_members
  FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Can insert club member" ON public.club_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Members can leave club" ON public.club_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- CLUB_INVITES policies
CREATE POLICY "Invited user can view their invites" ON public.club_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = invited_user_id OR public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Club members can create invites" ON public.club_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Invited user can update invite" ON public.club_invites
  FOR UPDATE TO authenticated
  USING (auth.uid() = invited_user_id);

CREATE POLICY "Invite creator or invited can delete" ON public.club_invites
  FOR DELETE TO authenticated
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

-- CLUB_MOVIES policies
CREATE POLICY "Members can view club movies" ON public.club_movies
  FOR SELECT TO authenticated
  USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Members can add movies" ON public.club_movies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_club_member(auth.uid(), club_id) AND auth.uid() = user_id);

CREATE POLICY "Users can remove their own movies" ON public.club_movies
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_club_members_club ON public.club_members(club_id);
CREATE INDEX idx_club_members_user ON public.club_members(user_id);
CREATE INDEX idx_club_invites_user ON public.club_invites(invited_user_id);
CREATE INDEX idx_club_invites_club ON public.club_invites(club_id);
CREATE INDEX idx_club_movies_club ON public.club_movies(club_id);
CREATE INDEX idx_clubs_invite_code ON public.clubs(invite_code);

-- Trigger for updated_at on clubs
CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();