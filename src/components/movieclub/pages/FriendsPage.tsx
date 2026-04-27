// @ts-nocheck
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { C, resolveAvatarUrl } from "../foundation";
import {
  Search, Users, UserRound, UserPlus, UserCheck,
  Link2, ChevronRight, Handshake, Star, Film,
  Activity, Rss, Clapperboard, TrendingUp,
} from "lucide-react";
import { Spinner } from "../ui";
import { useFollows, useFriendships } from "../hooks";

// ─── Avatar Component ─────────────────────────────────────
function Avatar({ profile, size = 44, ringColor, badge }) {
  const avatarUrl = resolveAvatarUrl(profile?.avatar_url);
  const initials = (profile?.display_name || "?").slice(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
        background: avatarUrl ? "transparent" : `linear-gradient(135deg, ${C.gold}99, ${C.goldLight}99)`,
        border: `2px solid ${ringColor || C.border}`,
        boxShadow: ringColor ? `0 0 0 1px ${ringColor}44, 0 4px 12px rgba(0,0,0,0.3)` : `0 4px 12px rgba(0,0,0,0.3)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.32, fontWeight: 800, color: C.bgDeep,
        fontFamily: "'Outfit', sans-serif", transition: "all 0.2s",
      }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials}
      </div>
      {badge && (
        <div style={{
          position: "absolute", bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: "50%",
          background: badge, border: `2px solid ${C.bgCard}`,
        }} />
      )}
    </div>
  );
}

// ─── User Card ────────────────────────────────────────────
function UserCard({ profile, currentUserId, isFollowing, isFriend, isFollowPending, onFollow, onUnfollow, onViewProfile }) {
  const following = isFollowing(profile.user_id);
  const friend = isFriend(profile.user_id);
  const isMe = profile.user_id === currentUserId;
  const pending = isFollowPending ? isFollowPending(profile.user_id) : false;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px",
        background: hovered
          ? `linear-gradient(135deg, rgba(201,168,76,0.05), ${C.bgCardHover})`
          : `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.95))`,
        borderRadius: 16, border: `1px solid ${hovered ? "rgba(201,168,76,0.2)" : C.border}`,
        transition: "all 0.22s", cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isMe && onViewProfile?.(profile.user_id)}
    >
      <Avatar
        profile={profile}
        size={48}
        ringColor={friend ? "#22C55E" : following ? C.gold : null}
        badge={friend ? "#22C55E" : null}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.display_name || "Sem nome"}
          </p>
          {friend && (
            <span style={{ fontSize: 9, color: "#22C55E", fontWeight: 700, background: "rgba(34,197,94,0.12)", padding: "2px 7px", borderRadius: 999, flexShrink: 0, letterSpacing: "0.05em" }}>
              AMIGO
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: C.gold, opacity: 0.8 }}>
          {profile.username ? `@${profile.username}` : ""}
        </p>
        {profile.bio && (
          <p style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.bio}
          </p>
        )}
      </div>

      {!isMe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (pending) return;
            following ? onUnfollow(profile.user_id) : onFollow(profile.user_id);
          }}
          disabled={pending}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: following ? "8px 14px" : "8px 16px",
            borderRadius: 12, fontSize: 12, fontWeight: 700, flexShrink: 0,
            background: following
              ? "rgba(201,168,76,0.1)"
              : `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
            border: following ? `1px solid rgba(201,168,76,0.3)` : "none",
            color: following ? C.gold : C.bgDeep,
            cursor: pending ? "wait" : "pointer", minHeight: "unset", minWidth: "unset",
            opacity: pending ? 0.65 : 1,
            fontFamily: "'Outfit', sans-serif", transition: "all 0.18s",
          }}
        >
          {pending ? (
            <><Spinner size={12} /> {following ? "Saindo…" : "Seguindo…"}</>
          ) : following ? (
            <><UserCheck size={13} /> Seguindo</>
          ) : (
            <><UserPlus size={13} /> Seguir</>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Activity Item ────────────────────────────────────────
function ActivityItem({ entry, onOpenMovie, onViewProfile }) {
  const name = entry.profile?.display_name || "Amigo";
  const ini = name.slice(0, 2).toUpperCase();
  const [hovered, setHovered] = useState(false);

  const when = useMemo(() => {
    try {
      const diff = (Date.now() - new Date(entry.created_at).getTime()) / 1000;
      if (diff < 60) return "agora";
      if (diff < 3600) return `${Math.floor(diff / 60)}min`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
      return new Date(entry.created_at).toLocaleDateString("pt-BR");
    } catch { return ""; }
  }, [entry.created_at]);

  const stars = Number(entry.rating);
  const fullStars = Math.floor(stars);
  const hasHalf = stars - fullStars >= 0.5;

  return (
    <div
      style={{
        display: "flex", gap: 12, padding: "14px 16px", borderRadius: 16,
        background: hovered
          ? `linear-gradient(135deg, rgba(201,168,76,0.04), ${C.bgCardHover})`
          : `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.95))`,
        border: `1px solid ${hovered ? "rgba(201,168,76,0.15)" : C.border}`,
        alignItems: "center", transition: "all 0.2s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <button
        onClick={() => onViewProfile(entry.user_id)}
        style={{
          width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          background: entry.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
          border: `2px solid rgba(201,168,76,0.3)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: C.bgDeep, cursor: "pointer",
          minHeight: "unset", minWidth: "unset",
        }}
      >
        {entry.profile?.avatar_url
          ? <img src={resolveAvatarUrl(entry.profile.avatar_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : ini}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 4 }}>
          <button onClick={() => onViewProfile(entry.user_id)} style={{ background: "none", border: "none", padding: 0, color: C.text, fontWeight: 700, cursor: "pointer", minHeight: "unset", minWidth: "unset", fontSize: 13, fontFamily: "inherit" }}>
            {name}
          </button>
          <span style={{ color: C.textMuted }}> avaliou </span>
          <button onClick={() => onOpenMovie(entry)} style={{ background: "none", border: "none", padding: 0, color: C.gold, fontWeight: 600, cursor: "pointer", minHeight: "unset", minWidth: "unset", fontSize: 13, fontFamily: "inherit" }}>
            {entry.title || "filme"}
          </button>
        </p>

        {/* Stars row */}
        {entry.rating && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={10} style={{
                  color: s <= Math.ceil(stars) ? C.gold : "#2a3d50",
                  fill: s <= fullStars ? C.gold : "transparent",
                }} />
              ))}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{stars.toFixed(1)}</span>
            <span style={{ fontSize: 10, color: C.textDim }}>· {when}</span>
          </div>
        )}
      </div>

      {/* Poster */}
      {entry.poster_url && (
        <button
          onClick={() => onOpenMovie(entry)}
          style={{
            width: 40, height: 58, borderRadius: 8, overflow: "hidden", flexShrink: 0,
            background: C.bgCard, border: "none", padding: 0, cursor: "pointer",
            minHeight: "unset", minWidth: "unset",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <img src={entry.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </button>
      )}
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────
function ActivityFeed({ userId, friendIds, setPage, setSelectedMovie, onViewProfile }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !friendIds.length) { setActivity([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data: ratings } = await supabase
        .from("ratings").select("*")
        .in("user_id", friendIds)
        .order("updated_at", { ascending: false }).limit(40);
      if (!ratings?.length) { setActivity([]); setLoading(false); return; }
      const uniqueIds = [...new Set(ratings.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, display_name, avatar_url, username")
        .in("user_id", uniqueIds);
      const map = {};
      (profiles || []).forEach(p => { map[p.user_id] = p; });
      setActivity(ratings.map(r => ({
        id: r.id, user_id: r.user_id, tmdb_id: r.tmdb_id,
        title: r.title, poster_url: r.poster_url, rating: r.rating,
        created_at: r.updated_at, profile: map[r.user_id] || null,
      })));
    } catch {}
    setLoading(false);
  }, [userId, friendIds]);

  useEffect(() => { load(); }, [load]);

  const handleOpenMovie = (entry) => {
    setSelectedMovie?.({ tmdbId: entry.tmdb_id, title: entry.title, poster: entry.poster_url });
    setPage("movie");
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <Spinner size={28} />
    </div>
  );

  if (!friendIds.length) return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Rss size={28} style={{ color: C.textDim }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Feed vazio</p>
      <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>Siga outras pessoas para ver o que estão assistindo</p>
    </div>
  );

  if (!activity.length) return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.bgCard, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Film size={28} style={{ color: C.textDim }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Sem atividade recente</p>
      <p style={{ fontSize: 13, color: C.textDim }}>Seus amigos ainda não avaliaram filmes</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="friends-activity-grid">
      {activity.map(entry => (
        <ActivityItem key={entry.id} entry={entry} onOpenMovie={handleOpenMovie} onViewProfile={onViewProfile} />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px" }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: `linear-gradient(135deg, rgba(201,168,76,0.08), ${C.bgCard})`,
        border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <Icon size={28} style={{ color: C.textDim }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{sub}</p>
    </div>
  );
}

// ─── FriendsPage ──────────────────────────────────────────
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

  const { following, followers, follow, unfollow, isFollowing, isPending: isFollowPending, loading: followsLoading } = useFollows(userId);
  const { friends, isFriend } = useFriendships(userId);
  const followingIds = following.map(f => f.following_id);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    debRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const q = searchQuery.trim().toLowerCase();
      const { data } = await supabase.from("profiles").select("*")
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .neq("user_id", userId).limit(20);
      setSearchResults(data || []);
      setSearchLoading(false);
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [searchQuery, userId]);

  useEffect(() => {
    if (!following.length) { setFollowingProfiles([]); return; }
    supabase.from("profiles").select("*").in("user_id", following.map(f => f.following_id))
      .then(({ data }) => setFollowingProfiles(data || []));
  }, [following]);

  useEffect(() => {
    if (!followers.length) { setFollowerProfiles([]); return; }
    supabase.from("profiles").select("*").in("user_id", followers.map(f => f.follower_id))
      .then(({ data }) => setFollowerProfiles(data || []));
  }, [followers]);

  useEffect(() => {
    if (!friends.length) { setFriendProfiles([]); return; }
    const ids = friends.map(f => f.user_a_id === userId ? f.user_b_id : f.user_a_id);
    supabase.from("profiles").select("*").in("user_id", ids)
      .then(({ data }) => setFriendProfiles(data || []));
  }, [friends, userId]);

  const tabs = [
    { id: "activity", label: "Feed", icon: <Rss size={14} /> },
    { id: "search", label: "Buscar", icon: <Search size={14} /> },
    { id: "following", label: `Seguindo (${following.length})` },
    { id: "followers", label: `Seguidores (${followers.length})` },
    { id: "friends", label: `Amigos (${friends.length})` },
  ];

  const cardProps = (profile) => ({
    profile, currentUserId: userId, isFollowing, isFriend, isFollowPending,
    onFollow: follow, onUnfollow: unfollow, onViewProfile,
  });

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 100 }}>
      {/* Background ambient */}
      <div style={{ position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}0e, transparent 65%)`, filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ padding: "22px 16px 0" }} className="friends-header">
          {/* Share profile */}
          <div
            onClick={() => {
              const url = `${window.location.origin}?profile=${userId}`;
              navigator.clipboard.writeText(url)
                .then(() => toast.success("Link do perfil copiado!"))
                .catch(() => toast.error("Erro ao copiar"));
            }}
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
              background: `linear-gradient(135deg, ${C.bgCard}, rgba(20,35,50,0.95))`,
              border: `1px solid rgba(201,168,76,0.2)`,
              borderRadius: 16, cursor: "pointer", marginBottom: 18,
              transition: "all 0.2s",
            }}
            className="card-hover"
          >
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `rgba(201,168,76,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Link2 size={18} style={{ color: C.gold }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Compartilhar Perfil</p>
              <p style={{ fontSize: 11, color: C.textMuted }}>Copie o link e envie para amigos</p>
            </div>
            <ChevronRight size={15} style={{ color: C.textDim }} />
          </div>
        </div>

        {/* ── Search bar (search tab only) ── */}
        {tab === "search" && (
          <div style={{ position: "sticky", top: 52, zIndex: 9, background: "rgba(15,25,35,0.97)", backdropFilter: "blur(16px)", padding: "0 16px 12px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <Search size={15} style={{ color: C.textDim }} />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou @username…"
                autoFocus
                style={{
                  width: "100%", padding: "12px 14px 12px 42px",
                  borderRadius: 14, background: C.bgCard,
                  border: `1px solid ${C.border}`, color: C.text,
                  fontSize: 15, outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = C.gold}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
              {searchLoading && <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}><Spinner size={16} /></div>}
              {searchQuery && !searchLoading && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.textDim, minHeight: "unset", minWidth: "unset", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              )}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{
          display: "flex", gap: 8, padding: "0 16px 16px", overflowX: "auto",
          scrollbarWidth: "none", position: "sticky",
          top: tab === "search" ? "unset" : 52, zIndex: 8,
          background: tab === "search" ? "transparent" : "rgba(15,25,35,0.97)",
          backdropFilter: tab === "search" ? "none" : "blur(16px)",
        }}>
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (id !== "search") setSearchQuery(""); }}
              style={{
                padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                background: tab === id ? `linear-gradient(135deg, ${C.goldDim}, ${C.gold})` : C.bgCard,
                color: tab === id ? C.bgDeep : C.textMuted,
                border: tab === id ? "none" : `1px solid ${C.border}`,
                cursor: "pointer", minHeight: "unset", minWidth: "unset",
                transition: "all 0.2s",
              }}
            >
              {icon && icon}{label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "0 16px" }}>

          {tab === "activity" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Activity size={15} style={{ color: C.gold }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>O que seus amigos assistiram</p>
              </div>
              <ActivityFeed
                userId={userId}
                friendIds={followingIds}
                setPage={setPage}
                setSelectedMovie={setSelectedMovie}
                onViewProfile={onViewProfile}
              />
            </div>
          )}

          {tab === "search" && (
            searchResults.length > 0 ? (
              <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {searchResults.map(p => <UserCard key={p.id} {...cardProps(p)} />)}
              </div>
            ) : searchQuery && !searchLoading ? (
              <EmptyState icon={Search} title="Nenhum resultado" sub={`Não encontramos ninguém com "${searchQuery}"`} />
            ) : !searchQuery ? (
              <EmptyState icon={Users} title="Busque por pessoas" sub="Digite um nome ou @username para encontrar cinéfilos" />
            ) : (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={28} /></div>
            )
          )}

          {tab === "following" && (
            followsLoading
              ? <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={28} /></div>
              : followingProfiles.length > 0
                ? <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>{followingProfiles.map(p => <UserCard key={p.id} {...cardProps(p)} />)}</div>
                : <EmptyState icon={UserRound} title="Você não segue ninguém" sub="Busque por pessoas e comece a seguir!" />
          )}

          {tab === "followers" && (
            followsLoading
              ? <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner size={28} /></div>
              : followerProfiles.length > 0
                ? <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>{followerProfiles.map(p => <UserCard key={p.id} {...cardProps(p)} />)}</div>
                : <EmptyState icon={UserRound} title="Nenhum seguidor ainda" sub="Compartilhe seu perfil para ganhar seguidores!" />
          )}

          {tab === "friends" && (
            friendProfiles.length > 0 ? (
              <div className="friends-grid" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {friendProfiles.map(p => <UserCard key={p.id} {...cardProps(p)} />)}
              </div>
            ) : (
              <EmptyState icon={Handshake} title="Nenhum amigo ainda" sub="Amizades surgem quando dois usuários se seguem mutuamente" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
