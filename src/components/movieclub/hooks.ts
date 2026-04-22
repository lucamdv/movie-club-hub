// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  tmdb, omdb, streaming, normalizeTmdb, mergeOmdb,
  parseStreamingServices,
} from "./foundation";

function useMovieDetails(tmdbId) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamServices, setStreamServices] = useState([]);
  useEffect(() => {
    if (!tmdbId) return;
    let alive = true;
    setLoading(true);
    setMovie(null);
    setStreamServices([]);
    tmdb
      .details(tmdbId)
      .then(async (raw) => {
        if (!alive) return;
        const base = normalizeTmdb(raw);
        setMovie(base);
        setLoading(false);
        const [omdbRes, streamRes] = await Promise.allSettled([
          base.imdbId
            ? omdb.byImdbId(base.imdbId)
            : omdb.byTitle(base.title, base.year),
          streaming.byTmdb(tmdbId),
        ]);
        if (!alive) return;
        setMovie(mergeOmdb(base, omdbRes.value));
        setStreamServices(parseStreamingServices(streamRes.value));
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tmdbId]);
  return { movie, loading, streamServices };
}

function usePaginatedMovies(fetcher) {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    (p) => {
      setLoading(true);
      fetcher(p)
        .then((d) => {
          setMovies((d.results || []).map(normalizeTmdb).filter(Boolean));
          setTotalPages(d.totalAppPages || 1);
          setTotalResults(d.totalResults || 0);
          setPage(d.appPage || p);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [fetcher],
  );
  useEffect(() => {
    load(1);
  }, [load]);
  const goTo = useCallback(
    (p) => {
      if (p >= 1 && p <= totalPages) load(p);
    },
    [load, totalPages],
  );
  return { movies, page, totalPages, totalResults, loading, goTo };
}


function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const userIdRef = useRef(null);
  const profileFetchedRef = useRef(null);
  const sessionRestoredRef = useRef(false);
  const fetchProfileRef = useRef(null);

  const fetchProfile = useCallback((userId) => {
    if (profileFetchedRef.current === userId) return;
    profileFetchedRef.current = userId;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setProfile(data);
      });
  }, []);

  fetchProfileRef.current = fetchProfile;

  useEffect(() => {
    let mounted = true;

    // 1. Restore session from storage first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user || null;
      userIdRef.current = u?.id || null;
      setUser(u);
      if (u) fetchProfileRef.current(u.id);
      setLoading(false);
      sessionRestoredRef.current = true;
    });

    // 2. Listen only for meaningful auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // Ignore these events completely
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;

      // Wait for getSession to complete first
      if (!sessionRestoredRef.current) return;

      const u = session?.user || null;
      const newId = u?.id || null;

      // CRITICAL: Only clear user on explicit SIGNED_OUT
      if (event === "SIGNED_OUT") {
        userIdRef.current = null;
        setUser(null);
        setProfile(null);
        profileFetchedRef.current = null;
        return;
      }

      // For other events, only update if we have a valid user
      if (!u) return; // Don't logout on null sessions from failed refreshes

      if (newId === userIdRef.current && event !== "USER_UPDATED") return;

      userIdRef.current = newId;
      setUser(u);
      if (event === "USER_UPDATED") profileFetchedRef.current = null;
      fetchProfileRef.current(u.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Dependências vazias mantêm o listener estável

  const signUp = async (email, password, name, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
    if (!data.session) {
      throw new Error(
        "Conta criada mas não foi possível fazer login automático. Tente fazer login manualmente.",
      );
    }
    if (data.user && username) {
      await supabase
        .from("profiles")
        .update({ username, display_name: name })
        .eq("user_id", data.user.id);
    }
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);
    if (error) throw error;
    // Force refetch so UI (avatar, name, etc.) syncs after update
    profileFetchedRef.current = null;
    fetchProfile(user.id);
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile,
  };
}

function useRatings(userId) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("ratings")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setRatings(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const upsertRating = async (tmdbId, rating, review, title, posterUrl) => {
    if (!userId) return;
    const { error } = await supabase.from("ratings").upsert(
      {
        user_id: userId,
        tmdb_id: tmdbId,
        rating,
        review,
        title,
        poster_url: posterUrl,
      },
      { onConflict: "user_id,tmdb_id" },
    );
    if (error) throw error;
    await load();
  };

  const deleteRating = async (tmdbId) => {
    if (!userId) return;
    await supabase
      .from("ratings")
      .delete()
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId);
    await load();
  };

  const getRating = (tmdbId) => ratings.find((r) => r.tmdb_id === tmdbId);

  return {
    ratings,
    loading,
    upsertRating,
    deleteRating,
    getRating,
    reload: load,
  };
}

function useWatchlist(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (tmdbId, title, posterUrl) => {
    if (!userId) return;
    const { error } = await supabase.from("watchlist").upsert(
      {
        user_id: userId,
        tmdb_id: tmdbId,
        title,
        poster_url: posterUrl,
      },
      { onConflict: "user_id,tmdb_id" },
    );
    if (error) throw error;
    await load();
  };

  const remove = async (tmdbId) => {
    if (!userId) return;
    await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId);
    await load();
  };

  const isInList = (tmdbId) => items.some((i) => i.tmdb_id === tmdbId);

  return { items, loading, add, remove, isInList, reload: load };
}

function useRecommendations(userId) {
  const { ratings } = useRatings(userId);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ratings.length) {
      setRecs([]);
      return;
    }
    let alive = true;
    setLoading(true);

    // 1. Calcula a média real de avaliações deste usuário
    const userAverage =
      ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length;

    // 2. Considera TODOS os filmes avaliados acima ou igual à média do usuário
    let seeds = ratings
      .filter((r) => Number(r.rating) >= userAverage)
      .sort((a, b) => Number(b.rating) - Number(a.rating));

    // Fallback: se a média colapsar (todos com a mesma nota), usa todas as avaliações
    if (!seeds.length) {
      seeds = [...ratings].sort(
        (a, b) => Number(b.rating) - Number(a.rating),
      );
    }

    const ratedIds = new Set(ratings.map((r) => r.tmdb_id));
    // Limita o número de chamadas paralelas para evitar rate-limit (mas usa MUITO mais que antes)
    const MAX_SEEDS = Math.min(seeds.length, 25);
    const activeSeeds = seeds.slice(0, MAX_SEEDS);
    // Peso de cada seed = sua nota (ex.: 5 pesa mais que 3.5)
    const maxRating = Math.max(...activeSeeds.map((s) => Number(s.rating)), 1);

    Promise.all(
      activeSeeds.map((r) =>
        tmdb
          .get(`/movie/${r.tmdb_id}/recommendations`)
          .then((res) => ({ res, weight: Number(r.rating) / maxRating }))
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (!alive) return;
        // Scoring ponderado: cada filme recebe score = soma(peso da seed * popularidade relativa)
        const scoreMap = new Map(); // id -> { movie, score }
        for (const item of results) {
          if (!item?.res?.results) continue;
          for (const raw of item.res.results) {
            const m = normalizeTmdb(raw);
            if (!m || ratedIds.has(m.id) || !m.poster) continue;
            const prev = scoreMap.get(m.id);
            const inc = item.weight * (1 + (raw.vote_average || 0) / 10);
            if (prev) {
              prev.score += inc;
            } else {
              scoreMap.set(m.id, { movie: m, score: inc });
            }
          }
        }
        const ranked = Array.from(scoreMap.values())
          .sort((a, b) => b.score - a.score)
          .map((x) => x.movie)
          .slice(0, 30);
        setRecs(ranked);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [ratings]);

  return { recs, loading };
}


function useFollows(userId) {
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: fing }, { data: fers }] = await Promise.all([
      supabase.from("follows").select("*").eq("follower_id", userId),
      supabase.from("follows").select("*").eq("following_id", userId),
    ]);
    setFollowing(fing || []);
    setFollowers(fers || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const follow = async (targetId) => {
    if (!userId) return;
    await supabase
      .from("follows")
      .insert({ follower_id: userId, following_id: targetId });
    await load();
    // Check mutual follow → auto-create friendship
    const { data: mutual } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", targetId)
      .eq("following_id", userId)
      .limit(1);
    if (mutual && mutual.length > 0) {
      const [a, b] = [userId, targetId].sort();
      await supabase
        .from("friendships")
        .upsert(
          { user_a_id: a, user_b_id: b },
          { onConflict: "user_a_id,user_b_id" },
        );
    }
  };

  const unfollow = async (targetId) => {
    if (!userId) return;
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("following_id", targetId);
    await load();
    // Remove friendship if no longer mutual
    const [a, b] = [userId, targetId].sort();
    await supabase
      .from("friendships")
      .delete()
      .eq("user_a_id", a)
      .eq("user_b_id", b);
  };

  const isFollowing = (targetId) =>
    following.some((f) => f.following_id === targetId);

  return {
    following,
    followers,
    loading,
    follow,
    unfollow,
    isFollowing,
    reload: load,
  };
}

function useFriendLinks(userId) {
  const [links, setLinks] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("friend_links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLinks(data || []);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createLink = async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("friend_links")
      .insert({ user_id: userId })
      .select()
      .single();
    if (error) throw error;
    await load();
    return data;
  };

  const deleteLink = async (id) => {
    await supabase.from("friend_links").delete().eq("id", id);
    await load();
  };

  return { links, createLink, deleteLink, reload: load };
}

function useFriendships(userId) {
  const [friends, setFriends] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
    setFriends(data || []);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const isFriend = (targetId) =>
    friends.some((f) => f.user_a_id === targetId || f.user_b_id === targetId);

  const acceptLink = async (code) => {
    if (!userId) return;
    // Find the link
    const { data: linkData } = await supabase
      .from("friend_links")
      .select("*")
      .eq("code", code)
      .single();
    if (!linkData) throw new Error("Link inválido");
    if (linkData.user_id === userId)
      throw new Error("Você não pode adicionar a si mesmo");
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date())
      throw new Error("Link expirado");
    // Check if already friends
    if (isFriend(linkData.user_id)) throw new Error("Vocês já são amigos");
    // Create friendship (order by smallest first to avoid duplicates)
    const [a, b] = [userId, linkData.user_id].sort();
    await supabase.from("friendships").insert({ user_a_id: a, user_b_id: b });
    await load();
  };

  return { friends, isFriend, acceptLink, reload: load };
}


function useClubs(userId) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: memberships } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId);
    if (memberships?.length) {
      const clubIds = memberships.map((m) => m.club_id);
      const { data: clubsData } = await supabase
        .from("clubs")
        .select("*")
        .in("id", clubIds)
        .order("created_at", { ascending: false });
      const enriched = await Promise.all(
        (clubsData || []).map(async (club) => {
          const [{ data: members }, { data: movies }] = await Promise.all([
            supabase
              .from("club_members")
              .select("user_id, role")
              .eq("club_id", club.id),
            supabase
              .from("club_movies")
              .select("id, tmdb_id")
              .eq("club_id", club.id),
          ]);
          const memberIds = (members || []).map((m) => m.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("*")
            .in("user_id", memberIds);
          return {
            ...club,
            members: (members || []).map((m) => ({
              ...m,
              profile: (profiles || []).find((p) => p.user_id === m.user_id),
            })),
            movieCount: (movies || []).length,
            movieIds: [...new Set((movies || []).map((m) => m.tmdb_id))].slice(
              0,
              5,
            ),
          };
        }),
      );
      setClubs(enriched);
    } else {
      setClubs([]);
    }
    const { data: invData } = await supabase
      .from("club_invites")
      .select("*, clubs(name)")
      .eq("invited_user_id", userId)
      .eq("status", "pending");
    setInvites(invData || []);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    load();
  }, [load]);
  const createClub = async (name, description) => {
    const { data: club, error } = await supabase
      .from("clubs")
      .insert({ name, description, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    await supabase
      .from("club_members")
      .insert({ club_id: club.id, user_id: userId, role: "owner" });
    await load();
    return club;
  };
  const inviteFriend = async (clubId, friendUserId) => {
    const { error } = await supabase.from("club_invites").insert({
      club_id: clubId,
      invited_by: userId,
      invited_user_id: friendUserId,
    });
    if (error) throw error;
  };
  const acceptInvite = async (inviteId, clubId) => {
    await supabase
      .from("club_invites")
      .update({ status: "accepted" })
      .eq("id", inviteId);
    await supabase
      .from("club_members")
      .insert({ club_id: clubId, user_id: userId });
    await load();
  };
  const declineInvite = async (inviteId) => {
    await supabase
      .from("club_invites")
      .update({ status: "declined" })
      .eq("id", inviteId);
    await load();
  };
  const joinByCode = async (code) => {
    const { data: club } = await supabase
      .from("clubs")
      .select("id")
      .eq("invite_code", code)
      .single();
    if (!club) throw new Error("Código inválido");
    const { data: existing } = await supabase
      .from("club_members")
      .select("id")
      .eq("club_id", club.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) throw new Error("Você já é membro deste club");
    await supabase
      .from("club_members")
      .insert({ club_id: club.id, user_id: userId });
    await load();
    return club;
  };
  return {
    clubs,
    loading,
    invites,
    createClub,
    inviteFriend,
    acceptInvite,
    declineInvite,
    joinByCode,
    reload: load,
  };
}

function useClubDetail(clubId, userId) {
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const [{ data: clubData }, { data: membersData }, { data: moviesData }] =
      await Promise.all([
        supabase.from("clubs").select("*").eq("id", clubId).single(),
        supabase.from("club_members").select("*").eq("club_id", clubId),
        supabase
          .from("club_movies")
          .select("*")
          .eq("club_id", clubId)
          .order("added_at", { ascending: false }),
      ]);
    setClub(clubData);
    const memberIds = (membersData || []).map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", memberIds);
    setMembers(
      (membersData || []).map((m) => ({
        ...m,
        profile: (profiles || []).find((p) => p.user_id === m.user_id),
      })),
    );
    setMovies(moviesData || []);
    setLoading(false);
  }, [clubId]);
  useEffect(() => {
    load();
  }, [load]);
  const addMovie = async (tmdbId, title, posterUrl) => {
    const { error } = await supabase.from("club_movies").insert({
      club_id: clubId,
      user_id: userId,
      tmdb_id: tmdbId,
      title,
      poster_url: posterUrl,
    });
    if (error) {
      if (error.code === "23505") throw new Error("Filme já adicionado");
      throw error;
    }
    await load();
  };
  const removeMovie = async (movieId) => {
    await supabase.from("club_movies").delete().eq("id", movieId);
    await load();
  };
  const leaveClub = async () => {
    if (!clubId || !userId) return;
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("club_id", clubId)
      .eq("user_id", userId);
    if (error) throw error;
  };
  const deleteClub = async () => {
    if (!clubId) return;
    const { error } = await supabase.from("clubs").delete().eq("id", clubId);
    if (error) throw error;
  };
  return {
    club,
    members,
    movies,
    loading,
    addMovie,
    removeMovie,
    leaveClub,
    deleteClub,
    reload: load,
  };
}

// ─────────────────────────────────────────────
//  CLUB ACTIVITY (Histórico de atividade)

function useClubActivity(clubId) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("club_activity")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(50);
    const userIds = Array.from(new Set((rows || []).map((r) => r.user_id)));
    let profiles = [];
    if (userIds.length) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", userIds);
      profiles = data || [];
    }
    setActivity(
      (rows || []).map((r) => ({
        ...r,
        profile: profiles.find((p) => p.user_id === r.user_id) || null,
      })),
    );
    setLoading(false);
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const logActivity = async ({ userId, tmdbId, title, posterUrl, rating }) => {
    if (!clubId || !userId) return;
    const { error } = await supabase.from("club_activity").insert({
      club_id: clubId,
      user_id: userId,
      tmdb_id: tmdbId,
      title: title || null,
      poster_url: posterUrl || null,
      rating,
    });
    if (error) throw error;
    await load();
  };

  return { activity, loading, logActivity, reload: load };
}

export {
  useMovieDetails, usePaginatedMovies, useAuth, useRatings, useWatchlist,
  useRecommendations, useFollows, useFriendLinks, useFriendships,
  useClubs, useClubDetail, useClubActivity,
};
