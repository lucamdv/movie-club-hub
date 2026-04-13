-- Allow authenticated users to view all ratings (for viewing other profiles)
DROP POLICY IF EXISTS "Users can view their own ratings" ON public.ratings;
CREATE POLICY "Users can view all ratings" ON public.ratings FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to view all watchlists (for viewing other profiles)
DROP POLICY IF EXISTS "Users can view their own watchlist" ON public.watchlist;
CREATE POLICY "Users can view all watchlists" ON public.watchlist FOR SELECT TO authenticated USING (true);