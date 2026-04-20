// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { C, tmdb } from "../foundation";
import { Film, Users, Link2, Eye, Star, Activity, ChevronLeft } from "lucide-react";
import { Spinner, Btn } from "../ui";
import { BackIcon, PlusIcon } from "../ui";
import { useClubDetail, useClubs, useFriendships, useRatings, useClubActivity } from "../hooks";

// ─── Watch & Rate Modal ───────────────────────
function WatchRateModal({ movie, existingRating, onClose, onSubmit }) {
  const [rating, setRating] = useState(existingRating?.rating ? Number(existingRating.rating) : 0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!rating || rating < 0.5) {
      toast.error("Escolha uma nota antes de confirmar");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(rating);
      onClose();
    } catch (e) {
      toast.error(e?.message || "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  };

  const display = hover || rating;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 26, width: "100%", maxWidth: 420, maxHeight: "calc(100dvh - 40px)", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: C.text }}>
            Marcar como visto
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: C.bgDeep, border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
          <div style={{ width: 64, height: 96, borderRadius: 8, overflow: "hidden", background: C.bgDeep, flexShrink: 0 }}>
            {movie.poster_url ? <img src={movie.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}><Film size={20} /></div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{movie.title}</p>
            <p style={{ fontSize: 12, color: C.textMuted }}>Avalie de 0,5 a 5 estrelas</p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((i) => {
            const full = display >= i;
            const half = !full && display >= i - 0.5;
            return (
              <div key={i} style={{ position: "relative", width: 36, height: 36, cursor: "pointer" }}
                onMouseLeave={() => setHover(0)}>
                <div onMouseEnter={() => setHover(i - 0.5)} onClick={() => setRating(i - 0.5)} style={{ position: "absolute", inset: 0, width: "50%", zIndex: 2 }} />
                <div onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "50%", zIndex: 2 }} />
                <Star size={36} style={{ color: full || half ? C.gold : "#3a4658", fill: full ? C.gold : "transparent" }} />
                {half && (
                  <div style={{ position: "absolute", inset: 0, overflow: "hidden", width: "50%", pointerEvents: "none" }}>
                    <Star size={36} style={{ color: C.gold, fill: C.gold }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13, marginBottom: 22 }}>
          {display ? `${display.toFixed(1)} / 5` : "Selecione uma nota"}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn variant="gold" size="sm" onClick={handleSubmit} disabled={saving || !rating}>
            {saving ? "Salvando..." : "Confirmar"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Activity history item ────────────────────
function ActivityItem({ entry, onOpenMovie }) {
  const name = entry.profile?.display_name || "Membro";
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
    <div style={{ display: "flex", gap: 12, padding: 14, borderRadius: 14, background: C.bgDeep, border: `1px solid ${C.border}`, alignItems: "center", transition: "all 0.2s" }}
      className="card-hover">
      <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: entry.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.bgDeep, flexShrink: 0 }}>
        {entry.profile?.avatar_url ? <img src={entry.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>{name}</span>
          <span style={{ color: C.textMuted }}> assistiu </span>
          <button onClick={() => onOpenMovie(entry)} style={{ background: "none", border: "none", padding: 0, color: C.gold, fontWeight: 600, cursor: "pointer", minHeight: "unset", minWidth: "unset", fontSize: 13 }}>
            {entry.title || "filme"}
          </button>
          <span style={{ color: C.textMuted }}> e avaliou </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.gold, fontWeight: 700 }}>
            {Number(entry.rating).toFixed(1)} <Star size={11} style={{ fill: C.gold, color: C.gold }} />
          </span>
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

export function GroupPage({ group, setPage, setSelectedMovie, auth: authCtx }) {
  const userId = authCtx?.user?.id;
  const clubId = group?.id;
  const { club, members, movies, loading, addMovie, removeMovie } = useClubDetail(clubId, userId);
  const { friends } = useFriendships(userId);
  const { inviteFriend } = useClubs(userId);
  const { upsertRating, getRating } = useRatings(userId);
  const { activity, logActivity } = useClubActivity(clubId);
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [movieSearch, setMovieSearch] = useState("");
  const [movieResults, setMovieResults] = useState([]);
  const [movieSearchLoading, setMovieSearchLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const [watchTarget, setWatchTarget] = useState(null);
  const debRef = useRef(null);

  useEffect(() => {
    if (!showInvite || !friends.length || !userId) return;
    const friendIds = friends.map((f) => f.user_a_id === userId ? f.user_b_id : f.user_a_id);
    const existingMemberIds = members.map((m) => m.user_id);
    const invitableIds = friendIds.filter((id) => !existingMemberIds.includes(id));
    if (!invitableIds.length) { setFriendProfiles([]); return; }
    supabase.from("profiles").select("*").in("user_id", invitableIds).then(({ data }) => setFriendProfiles(data || []));
  }, [showInvite, friends, members, userId]);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!movieSearch.trim()) { setMovieResults([]); return; }
    debRef.current = setTimeout(async () => {
      setMovieSearchLoading(true);
      const res = await tmdb.search(movieSearch.trim());
      setMovieResults((res?.results || []).slice(0, 10));
      setMovieSearchLoading(false);
    }, 400);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [movieSearch]);

  const handleAddMovie = async (movie) => {
    try {
      await addMovie(movie.id, movie.title, tmdb.poster(movie.poster_path));
      toast.success(`"${movie.title}" adicionado ao club!`);
    } catch (e) { toast.error(e.message || "Erro ao adicionar filme"); }
  };

  const handleInvite = async (friendUserId) => {
    try {
      await inviteFriend(clubId, friendUserId);
      toast.success("Convite enviado!");
    } catch (e) {
      if (e.code === "23505") toast.info("Convite já enviado");
      else toast.error("Erro ao enviar convite");
    }
  };

  const handleCopyInviteLink = () => {
    if (!club) return;
    const url = `${window.location.origin}?club=${club.invite_code}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link do club copiado!")).catch(() => toast.error("Erro ao copiar"));
  };

  const handleConfirmWatch = async (rating) => {
    if (!watchTarget || !userId) return;
    await upsertRating(watchTarget.tmdb_id, rating, null, watchTarget.title, watchTarget.poster_url);
    await logActivity({ userId, tmdbId: watchTarget.tmdb_id, title: watchTarget.title, posterUrl: watchTarget.poster_url, rating });
    toast.success(`"${watchTarget.title}" marcado como visto!`);
  };

  const openMovieFromActivity = (entry) => {
    setSelectedMovie({ tmdbId: entry.tmdb_id, title: entry.title, poster: entry.poster_url });
    setPage("movie");
  };

  if (!clubId) return null;

  const moviesByUser = {};
  movies.forEach((m) => { if (!moviesByUser[m.user_id]) moviesByUser[m.user_id] = []; moviesByUser[m.user_id].push(m); });

  const MemberAvatar = ({ member, size = 46 }) => {
    const ini = (member.profile?.display_name || "?").slice(0, 2).toUpperCase();
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: member.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 700, color: C.bgDeep, flexShrink: 0 }}>
        {member.profile?.avatar_url ? <img src={member.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
      </div>
    );
  };

  // ─── MOBILE LAYOUT ───
  const isMobileView = typeof window !== "undefined" && window.innerWidth <= 767;

  if (isMobileView) {
    return (
      <div style={{ paddingTop: 80, paddingBottom: 100 }}>
        <div style={{ padding: "0 16px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={36} /></div>
          ) : (
            <>
              {/* Club header */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 16px", marginBottom: 20 }}>
                <button onClick={() => setPage("groups")} style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 12, background: "none", border: "none", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>
                  <ChevronLeft size={16} /> Meus Clubs
                </button>
                <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>{club?.name}</h1>
                {club?.description && <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{club.description}</p>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn variant="gold" size="sm" onClick={() => setShowAddMovie(true)}><PlusIcon /> Filme</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setShowInvite(true)}><Users size={13} /> Convidar</Btn>
                  <Btn variant="ghost" size="sm" onClick={handleCopyInviteLink}><Link2 size={13} /> Link</Btn>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {members.map((m) => {
                    const ini = (m.profile?.display_name || "?").slice(0, 2).toUpperCase();
                    return (
                      <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", overflow: "hidden", background: m.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: C.bgDeep }}>
                          {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
                        </div>
                        <span style={{ fontSize: 11, color: C.textMuted }}>{m.profile?.display_name || "Membro"}</span>
                        {m.role === "owner" && <span style={{ fontSize: 9, color: C.gold, fontWeight: 600 }}>DONO</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Movies by member */}
              {movies.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 28, marginBottom: 28 }}>
                  {members.map((member) => {
                    const memberMovies = moviesByUser[member.user_id] || [];
                    if (!memberMovies.length) return null;
                    return (
                      <div key={member.user_id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                          <MemberAvatar member={member} size={36} />
                          <div>
                            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600, color: C.text }}>{member.profile?.display_name || "Membro"}</h3>
                            <p style={{ fontSize: 11, color: C.textMuted }}>{memberMovies.length} filme{memberMovies.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                          {memberMovies.map((mv) => {
                            const myRating = getRating(mv.tmdb_id);
                            const watched = !!myRating;
                            const isMine = mv.user_id === userId;
                            return (
                              <div key={mv.id} style={{ position: "relative" }} className="movie-card-netflix">
                                <div style={{ cursor: "pointer" }} onClick={() => { setSelectedMovie({ tmdbId: mv.tmdb_id, title: mv.title, poster: mv.poster_url }); setPage("movie"); }}>
                                  <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 10, overflow: "hidden", background: C.bgCard, border: `1px solid ${C.border}`, position: "relative" }}>
                                    {mv.poster_url ? <img src={mv.poster_url} alt={mv.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}><Film size={28} /></div>}
                                    {watched && (
                                      <div style={{ position: "absolute", top: 6, left: 6, padding: "2px 6px", borderRadius: 6, background: "rgba(0,0,0,0.78)", color: C.gold, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 2, border: `1px solid ${C.gold}` }}>
                                        <Eye size={9} /> {Number(myRating.rating).toFixed(1)}
                                      </div>
                                    )}
                                  </div>
                                  <p style={{ fontSize: 11, fontWeight: 500, color: C.text, marginTop: 6, lineHeight: 1.3 }}>{mv.title}</p>
                                </div>
                                {!isMine && (
                                  <button onClick={(e) => { e.stopPropagation(); setWatchTarget(mv); }} style={{ marginTop: 5, width: "100%", padding: "5px 6px", borderRadius: 7, background: watched ? C.bgDeep : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: watched ? C.gold : C.bgDeep, border: watched ? `1px solid ${C.gold}` : "none", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, minHeight: "unset", minWidth: "unset" }}>
                                    <Eye size={11} /> {watched ? "Reavaliar" : "Marcar visto"}
                                  </button>
                                )}
                                {isMine && (
                                  <button onClick={(e) => { e.stopPropagation(); removeMovie(mv.id); }} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", color: "#ef4444", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", marginBottom: 20 }}>
                  <Film size={36} style={{ color: "#4A5E72", marginBottom: 10 }} />
                  <p style={{ color: C.textMuted, fontSize: 14, fontWeight: 500 }}>Nenhum filme adicionado ainda</p>
                  <p style={{ color: C.textDim, fontSize: 12, marginTop: 4 }}>Clique em "+ Filme" para começar!</p>
                </div>
              )}

              {/* Activity */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: "18px 16px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Activity size={16} style={{ color: C.gold }} />
                  <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>Histórico de Atividade</h2>
                </div>
                {activity.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.textDim, textAlign: "center", padding: "16px 0" }}>Ninguém marcou filmes como vistos ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {activity.map((entry) => <ActivityItem key={entry.id} entry={entry} onOpenMovie={openMovieFromActivity} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        {showAddMovie && <AddMovieModal movieSearch={movieSearch} setMovieSearch={setMovieSearch} movieResults={movieResults} movieSearchLoading={movieSearchLoading} onAdd={handleAddMovie} onClose={() => { setShowAddMovie(false); setMovieSearch(""); setMovieResults([]); }} />}
        {showInvite && <InviteModal friendProfiles={friendProfiles} onInvite={handleInvite} onCopyLink={handleCopyInviteLink} onClose={() => setShowInvite(false)} />}
        {watchTarget && <WatchRateModal movie={watchTarget} existingRating={getRating(watchTarget.tmdb_id)} onClose={() => setWatchTarget(null)} onSubmit={handleConfirmWatch} />}
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ───
  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={36} /></div>
        ) : (
          <>
            {/* Header card */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: "26px 28px", marginBottom: 26 }}>
              <button onClick={() => setPage("groups")} style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 14, background: "none", border: "none", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>
                <BackIcon /> Meus Clubs
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>{club?.name}</h1>
                  {club?.description && <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>{club.description}</p>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="gold" size="sm" onClick={() => setShowAddMovie(true)}><PlusIcon /> Adicionar Filme</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setShowInvite(true)}><Users size={13} /> Convidar</Btn>
                  <Btn variant="ghost" size="sm" onClick={handleCopyInviteLink}><Link2 size={13} /> Link</Btn>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                {members.map((m) => {
                  const ini = (m.profile?.display_name || "?").slice(0, 2).toUpperCase();
                  return (
                    <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: m.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.bgDeep }}>
                        {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{m.profile?.display_name || "Membro"}</span>
                      {m.role === "owner" && <span style={{ fontSize: 9, color: C.gold, fontWeight: 600 }}>DONO</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two-column layout: movies + activity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
              {/* Left: Movies by member */}
              <div>
                {movies.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
                    {members.map((member) => {
                      const memberMovies = moviesByUser[member.user_id] || [];
                      if (!memberMovies.length) return null;
                      return (
                        <div key={member.user_id}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                            <MemberAvatar member={member} />
                            <div>
                              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>{member.profile?.display_name || "Membro"}</h3>
                              <p style={{ fontSize: 12, color: C.textMuted }}>{memberMovies.length} filme{memberMovies.length !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 16 }}>
                            {memberMovies.map((mv) => {
                              const myRating = getRating(mv.tmdb_id);
                              const watched = !!myRating;
                              const isMine = mv.user_id === userId;
                              return (
                                <div key={mv.id} style={{ position: "relative" }} className="movie-card-netflix">
                                  <div style={{ cursor: "pointer" }} onClick={() => { setSelectedMovie({ tmdbId: mv.tmdb_id, title: mv.title, poster: mv.poster_url }); setPage("movie"); }}>
                                    <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden", background: C.bgCard, border: `1px solid ${C.border}`, position: "relative" }}>
                                      {mv.poster_url ? <img src={mv.poster_url} alt={mv.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}><Film size={32} /></div>}
                                      {watched && (
                                        <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 7px", borderRadius: 6, background: "rgba(0,0,0,0.75)", color: C.gold, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, border: `1px solid ${C.gold}` }}>
                                          <Eye size={10} /> {Number(myRating.rating).toFixed(1)}
                                        </div>
                                      )}
                                    </div>
                                    <p style={{ fontSize: 12, fontWeight: 500, color: C.text, marginTop: 8, lineHeight: 1.3 }}>{mv.title}</p>
                                  </div>

                                  {/* Watch/Rate button for desktop */}
                                  {!isMine && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setWatchTarget(mv); }}
                                      style={{ marginTop: 6, width: "100%", padding: "7px 8px", borderRadius: 9, background: watched ? C.bgDeep : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: watched ? C.gold : C.bgDeep, border: watched ? `1px solid ${C.gold}` : "none", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: "unset", minWidth: "unset", transition: "all 0.18s" }}
                                      title={watched ? "Atualizar avaliação" : "Marcar como visto e avaliar"}
                                    >
                                      <Eye size={12} /> {watched ? "Reavaliar" : "Marcar visto"}
                                    </button>
                                  )}

                                  {isMine && (
                                    <button onClick={(e) => { e.stopPropagation(); removeMovie(mv.id); }} style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", color: "#ef4444", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "60px 20px", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
                    <Film size={40} style={{ color: "#4A5E72", marginBottom: 12 }} />
                    <p style={{ color: C.textMuted, fontSize: 15, fontWeight: 500 }}>Nenhum filme adicionado ainda</p>
                    <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>Clique em "Adicionar Filme" para começar!</p>
                  </div>
                )}
              </div>

              {/* Right: Activity feed (always visible on desktop) */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: "22px 20px", position: "sticky", top: 80, maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexShrink: 0 }}>
                  <Activity size={18} style={{ color: C.gold }} />
                  <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>
                    Atividade do Club
                  </h2>
                </div>
                <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
                  {activity.length === 0 ? (
                    <p style={{ fontSize: 13, color: C.textDim, textAlign: "center", padding: "24px 0" }}>
                      Ninguém marcou filmes como vistos ainda. Seja o primeiro!
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {activity.map((entry) => (
                        <ActivityItem key={entry.id} entry={entry} onOpenMovie={openMovieFromActivity} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add Movie Modal */}
            {showAddMovie && <AddMovieModal movieSearch={movieSearch} setMovieSearch={setMovieSearch} movieResults={movieResults} movieSearchLoading={movieSearchLoading} onAdd={handleAddMovie} onClose={() => { setShowAddMovie(false); setMovieSearch(""); setMovieResults([]); }} />}
            {showInvite && <InviteModal friendProfiles={friendProfiles} onInvite={handleInvite} onCopyLink={handleCopyInviteLink} onClose={() => setShowInvite(false)} />}
            {watchTarget && <WatchRateModal movie={watchTarget} existingRating={getRating(watchTarget.tmdb_id)} onClose={() => setWatchTarget(null)} onSubmit={handleConfirmWatch} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared Modals ───
function AddMovieModal({ movieSearch, setMovieSearch, movieResults, movieSearchLoading, onAdd, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: C.text }}>Adicionar Filme</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: C.bgDeep, border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
        </div>
        <input value={movieSearch} onChange={(e) => setMovieSearch(e.target.value)} placeholder="Buscar filme..." style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", marginBottom: 16 }} onFocus={(e) => (e.target.style.borderColor = C.gold)} onBlur={(e) => (e.target.style.borderColor = C.border)} />
        {movieSearchLoading ? <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Spinner size={24} /></div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {movieResults.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, background: C.bgDeep, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.2s" }} className="card-hover"
                onClick={() => { onAdd(m); onClose(); }}>
                <div style={{ width: 40, height: 60, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: C.bgCard }}>
                  {m.poster_path ? <img src={tmdb.poster(m.poster_path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Film size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{m.title}</p>
                  <p style={{ fontSize: 11, color: C.textDim }}>{m.release_date?.slice(0, 4)}</p>
                </div>
                <PlusIcon />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteModal({ friendProfiles, onInvite, onCopyLink, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: C.text }}>Convidar Amigos</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: C.bgDeep, border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
        </div>
        <div style={{ marginBottom: 20, padding: 14, borderRadius: 10, background: C.bgDeep, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Compartilhe o link de convite:</p>
          <Btn variant="gold" size="sm" onClick={onCopyLink}><Link2 size={13} /> Copiar Link do Club</Btn>
        </div>
        {friendProfiles.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friendProfiles.map((fp) => {
              const ini = (fp.display_name || "?").slice(0, 2).toUpperCase();
              return (
                <div key={fp.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, background: C.bgDeep, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: fp.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.bgDeep, flexShrink: 0 }}>
                    {fp.avatar_url ? <img src={fp.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{fp.display_name || "Sem nome"}</p>
                    {fp.username && <p style={{ fontSize: 11, color: C.gold }}>@{fp.username}</p>}
                  </div>
                  <Btn variant="gold" size="sm" onClick={() => onInvite(fp.user_id)}>Convidar</Btn>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0", color: C.textDim }}>
            <p style={{ fontSize: 13 }}>Nenhum amigo disponível para convidar</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Adicione amigos primeiro na aba Social</p>
          </div>
        )}
      </div>
    </div>
  );
}
