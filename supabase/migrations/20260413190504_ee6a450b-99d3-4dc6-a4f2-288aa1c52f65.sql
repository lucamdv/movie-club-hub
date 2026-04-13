
-- Follows table
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all follows" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Friend links table
CREATE TABLE public.friend_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.friend_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own links" ON public.friend_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create links" ON public.friend_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their links" ON public.friend_links FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anyone authenticated can read link by code" ON public.friend_links FOR SELECT TO authenticated USING (true);

-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_a_id, user_b_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "Authenticated users can create friendships" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "Users can remove their friendships" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Indexes
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_friendships_user_a ON public.friendships(user_a_id);
CREATE INDEX idx_friendships_user_b ON public.friendships(user_b_id);
CREATE INDEX idx_friend_links_code ON public.friend_links(code);
