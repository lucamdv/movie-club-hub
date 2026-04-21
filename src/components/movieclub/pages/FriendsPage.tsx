// @ts-nocheck
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { C } from "../foundation";
import {
  Search, Users, UserRound, UserPlus, UserCheck,
  Link2, ChevronRight, Handshake, Activity, Star, Film,
} from "lucide-react";
import { Spinner } from "../ui";
import { useFollows, useFriendships } from "../hooks";

// ─── UserCard compacto e premium ─────────────────────────
function UserCard({ profile, currentUserId, isFollowing, isFriend, onFollow, onUnfollow, onViewProfile }) {
  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.display_name || "?").slice(0, 2).toUpperCase();
  const following = isFollowing(profile.user_id);
  const friend = isFriend(profile.user_id);
  const isMe = profile.user_id === currentUserId;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: C.bgCard,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        transition: "all 0.18s",
        cursor: "pointer",
      }}
      className="card-hover"
      onClick={() => !isMe && onViewProfile?.(profile.user_id)}
    >
      <div style={{
        width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
        background: avatarUrl ? "transparent" : `linear-gradient(135deg, ${C.gold}99, ${C.goldLight}99)`,
        border: friend ? `2px solid #22C55E` : following ? `2px solid ${C.gold}` : `1.5px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 800, color: C.bgDeep, fontFamily: "'Outfit', sans-serif", flexShrink: 0,
      }}>
        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.display_name || "Sem nome"}
          </p>
          {friend && <span style={{ fontSize: 9, color: "#22C55E", fontWeight: 700, background: "rgba(34,197,94,0.12)", padding: "1px 6px", borderRadius: 6, flexShrink: 0 }}>AMIGO</span>}
        </div>
        {profile.username && <p style={{ fontSize: 12, color: C.gold, opacity: 0.8 }}>@{profile.username}</p>}
        {profile.bio && <p style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.bio}</p>}
      </div>
      {!isMe && (
        <button
          onClick={(e) => { e.stopPropagation(); following ? onUnfollow(profile.user_id) : onFollow(profile.user_id); }}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: following ? "rgba(201,168,76,0.12)" : `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
            border: following ? `1px solid ${C.goldDim}` : "none",
            color: following ? C.gold : C.bgDeep,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, minHeight: "unset", minWidth: "unset", transition: "all 0.18s", cursor: "pointer",
          }}
        >
          {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
        </button>
      )}
    </div>
  );
}

// ─── Friend Activity Item ───────────────────────────────
function FriendActivityItem({ entry, onOpenMovie, onViewProfile }) {
  const name = entry.profile?.display_name || "Amigo";
  const ini = name.slice(0, 2).toUpperCase();
  const when = useMemo(() => {
    try {
      const d = new Date(entry.created_at);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "agora";
      if (diff < 3600) return `${Math.floor(diff / 60)}min`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
      return d.toLocaleDateString("pt-BR");
    } catch { return ""; }
  }, [entry.created_at]);

  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 16, background: C.bgCard, border: `1px solid ${C.border}`, alignItems: "center", transition: "all 0.18s" }} className="card-hover">
      <button
        onClick={() => onViewProfile(entry.user_id)}
        style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", background: entry.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.bgDeep, flexShrink: 0, cursor: "pointer", minHeight: "unset", minWidth: "unset" }}
      >
        {entry.profile?.avatar_url ? <img src={entry.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
          <button onClick={() => onViewProfile(entry.user_id)} style={{ background: "none", border: "none", padding: 0, color: C.text, fontWeight: 700, cursor: "pointer", minHeight: "unset", minWidth: "unset", fontSize: 13 }}>{name}</button>
          <span style={{ color: C.textMuted }}> avaliou </span>
          <button onClick={() => onOpenMovie(entry)} style={{ background: "none", border: "none", padding: 0, color: C.gold, fontWeight: 600, cursor: "pointer", minHeight: "unset", minWidth: "unset", fontSize: 13 }}>
            {entry.title || "filme"}
          </button>
          {entry.rating && (
            <>
              <span style={{ color: C.textMuted }}> com </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.gold, fontWeight: 700 }}>
                {Number(entry.rating).toFixed(1)} <Star size={11} style={{ fill: C.gold, color: C.gold }} />
              </span>
            </>
          )}
        </p>
        <p style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{when}</p>
      </div>
      {entry.poster_url && (
        <button onClick={() => onOpenMovie(entry)} style={{ width: 38, height: 56, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: C.bgCard, border: "none", padding: 0, cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>
          <img src={entry.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </button>
      )}
    </div>
  );
}

// ─── Friends Activity Feed ─────────────────────────────
function FriendActivityFeed({ userId, friendIds, setPage, setSelectedMovie, onViewProfile }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !friendIds.length) { setActivity([]); setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch ratings from friends ordered by date
      const { data: ratings } = await supabase
        .from("ratings")
        .select("*")
        .in("user_id", friendIds)
        .order("updated_at", { ascending: false })
        .limit(40);

      if (!ratings?.length) { setActivity([]); setLoading(false); return; }

      const uniqueUserIds = [...new Set(ratings.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", uniqueUserIds);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });

      setActivity(ratings.map(r => ({
        id: r.id,
        user_id: r.user_id,
        tmdb_id: r.tmdb_id,
        title: r.title,
        poster_url: r.poster_url,
        rating: r.rating,
        created_at: r.updated_at,
        profile: profileMap[r.user_id] || null,
      })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [userId, friendIds]);

  useEffect(() => { load(); }, [load]);

  const handleOpenMovie = (entry) => {
    setSelectedMovie?.({ tmdbId: entry.tmdb_id, title: entry.title, poster: entry.poster_url });
    setPage("movie");
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={28} /></div>;

  if (!friendIds.length) return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Activity size={26} style={{ color: C.textDim }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Nenhuma atividade ainda</p>
      <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>Siga pessoas para ver o que elas estão assistindo</p>
    </div>
  );

  if (!activity.length) return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Film size={26} style={{ color: C.textDim }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>Sem atividade recente</p>
      <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>Seus amigos ainda não avaliaram filmes recentemente</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {activity.map(entry => (
        <FriendActivityItem
          key={entry.id}
          entry={entry}
          onOpenMovie={handleOpenMovie}
          onViewProfile={onViewProfile}
        />
      ))}
    </div>
  );
}

export function FriendsPage({ setPage, setSelectedMovie, auth: authCtx, onViewProfile }) {
  const userId = authCtx?.user?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tab, setTab] = useState("activity");
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [followerProfiles, setFollowerProfiles] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const debRef = useRef(null);

  const { following, followers, follow, unfollow, isFollowing, loading: followsLoading } = useFollows(userId);
  const { friends, isFriend } = useFriendships(userId);

  // All followed user IDs for activity feed
  const followingIds = following.map(f => f.following_id);

  // Search
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    debRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const q = searchQuery.trim().toLowerCase();
      const { data } = await supabase.from("profiles").select("*").or(`display_name.ilike.%${q}%,username.ilike.%${q}%`).neq("user_id", userId).limit(20);
      setSearchResults(data || []);
      setSearchLoading(false);
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [searchQuery, userId]);

  useEffect(() => {
    if (!following.length) { setFollowingProfiles([]); return; }
    supabase.from("profiles").select("*").in("user_id", following.map(f => f.following_id)).then(({ data }) => setFollowingProfiles(data || []));
  }, [following]);

  useEffect(() => {
    if (!followers.length) { setFollowerProfiles([]); return; }
    supabase.from("profiles").select("*").in("user_id", followers.map(f => f.follower_id)).then(({ data }) => setFollowerProfiles(data || []));
  }, [followers]);

  useEffect(() => {
    if (!friends.length) { setFriendProfiles([]); return; }
    const ids = friends.map(f => f.user_a_id === userId ? f.user_b_id : f.user_a_id);
    supabase.from("profiles").select("*").in("user_id", ids).then(({ data }) => setFriendProfiles(data || []));
  }, [friends, userId]);

  const tabs = [
    { id: "activity", label: "Atividade", icon: <Activity size={14} /> },
    { id: "search", label: "Buscar" },
    { id: "following", label: `Seg. (${following.length})` },
    { id: "followers", label: `Segd. (${followers.length})` },
    { id: "friends", label: `Amigos (${friends.length})` },
  ];

  const cardProps = (profile) => ({
    profile, currentUserId: userId, isFollowing, isFriend,
    onFollow: follow, onUnfollow: unfollow, onViewProfile,
  });

  const EmptyState = ({ icon: Icon, title, sub }) => (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Icon size={26} style={{ color: C.textDim }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.textMuted, marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>{sub}</p>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 100 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ padding: "20px 16px 0" }} className="friends-header">
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 4 }}>Social</h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Encontre amigos cinéfilos</p>

        {/* Share profile card */}
        <div
          onClick={() => {
            const url = `${window.location.origin}?profile=${userId}`;
            navigator.clipboard.writeText(url).then(() => toast.success("Link do perfil copiado!")).catch(() => toast.error("Erro ao copiar"));
          }}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
            background: `linear-gradient(135deg, ${C.bgCard}, #1a2d42)`,
            border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 16, cursor: "pointer",
            marginBottom: 16, transition: "all 0.2s",
          }}
          className="card-hover"
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(201,168,76,0.12)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Link2 size={18} style={{ color: C.gold }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Compartilhar Perfil</p>
            <p style={{ fontSize: 11, color: C.textMuted }}>Copie o link e envie para amigos</p>
          </div>
          <ChevronRight size={16} style={{ color: C.textDim }} />
        </div>
      </div>

      {/* ── Search bar (only when on search tab) ── */}
      {tab === "search" && (
        <div style={{ position: "sticky", top: 48, zIndex: 9, background: "rgba(15,25,35,0.97)", backdropFilter: "blur(12px)", padding: "0 16px 12px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <Search size={15} style={{ color: C.textDim }} />
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou @username…"
              autoFocus
              style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, fontSize: 15, outline: "none", transition: "border-color 0.2s" }}
              onFocus={(e) => (e.target.style.borderColor = C.gold)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            {searchLoading && <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}><Spinner size={16} /></div>}
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.textDim, minHeight: "unset", minWidth: "unset", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs pills ── */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", overflowX: "auto", scrollbarWidth: "none", position: "sticky", top: tab === "search" ? "unset" : 48, zIndex: 9, background: tab === "search" ? "transparent" : "rgba(15,25,35,0.97)", backdropFilter: tab === "search" ? "none" : "blur(12px)" }}>
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id !== "search") setSearchQuery(""); }}
            style={{
              padding: "8px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              whiteSpace: "nowrap", flexShrink: 0,
              background: tab === id ? `linear-gradient(135deg, ${C.goldDim}, ${C.gold})` : C.bgCard,
              color: tab === id ? C.bgDeep : C.textMuted,
              border: tab === id ? "none" : `1px solid ${C.border}`,
              transition: "all 0.2s", minHeight: "unset", minWidth: "unset",
              display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
            }}
          >
            {icon && icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "0 16px" }}>

        {/* Activity feed */}
        {tab === "activity" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Activity size={16} style={{ color: C.gold }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>O que seus amigos estão assistindo</p>
            </div>
            <FriendActivityFeed
              userId={userId}
              friendIds={followingIds}
              setPage={setPage}
              setSelectedMovie={setSelectedMovie}
              onViewProfile={onViewProfile}
            />
          </div>
        )}

        {/* Search results */}
        {tab === "search" && (
          searchResults.length > 0 ? (
            <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {searchResults.map((p) => <UserCard key={p.id} {...cardProps(p)} />)}
            </div>
          ) : searchQuery && !searchLoading ? (
            <EmptyState icon={Search} title="Nenhum resultado" sub={`Não encontramos ninguém com "${searchQuery}"`} />
          ) : !searchQuery ? (
            <EmptyState icon={Users} title="Busque por pessoas" sub="Digite um nome ou @username para encontrar outros cinéfilos" />
          ) : (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={28} /></div>
          )
        )}

        {/* Following */}
        {tab === "following" && (
          followsLoading ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={28} /></div>
          : followingProfiles.length > 0
            ? <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>{followingProfiles.map((p) => <UserCard key={p.id} {...cardProps(p)} />)}</div>
            : <EmptyState icon={UserRound} title="Você não segue ninguém" sub="Busque por pessoas e comece a seguir!" />
        )}

        {/* Followers */}
        {tab === "followers" && (
          followsLoading ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={28} /></div>
          : followerProfiles.length > 0
            ? <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>{followerProfiles.map((p) => <UserCard key={p.id} {...cardProps(p)} />)}</div>
            : <EmptyState icon={UserRound} title="Nenhum seguidor ainda" sub="Compartilhe seu perfil para ganhar seguidores!" />
        )}

        {/* Friends */}
        {tab === "friends" && (
          friendProfiles.length > 0 ? (
            <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {friendProfiles.map((p) => <UserCard key={p.id} {...cardProps(p)} />)}
            </div>
          ) : (
            <EmptyState icon={Handshake} title="Nenhum amigo ainda" sub="Amizades são formadas quando dois usuários se seguem mutuamente" />
          )
        )}
      </div>
      </div>
    </div>
  );
}
