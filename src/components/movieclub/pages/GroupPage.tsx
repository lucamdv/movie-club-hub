// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { C, tmdb } from "../foundation";
import {
  Film, Users, Link2, Eye, Star, Activity,
  ChevronLeft, Crown, Plus, X, Clock, Clapperboard,
  Sparkles, Ticket, Check, ArrowRight, LogOut, Trash2, AlertTriangle,
} from "lucide-react";
import { Spinner, Btn } from "../ui";
import { BackIcon, PlusIcon } from "../ui";
import { useClubDetail, useClubs, useFriendships, useRatings, useClubActivity } from "../hooks";
import mascotDirector from "@/assets/monkey-director.png";
import monkeyPopcorn from "@/assets/monkey-popcorn.png";

// ─── Helpers ────────────────────────────────────────────
function timeAgo(dateStr) {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d atrás`;
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch { return ""; }
}

// ─── Watch & Rate Modal ──────────────────────────────────
function WatchRateModal({ movie, existingRating, onClose, onSubmit }) {
  const [rating, setRating] = useState(existingRating?.rating ? Number(existingRating.rating) : 0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!rating || rating < 0.5) { toast.error("Escolha uma nota antes de confirmar"); return; }
    setSaving(true);
    try { await onSubmit(rating); onClose(); }
    catch (e) { toast.error(e?.message || "Erro ao registrar"); }
    finally { setSaving(false); }
  };

  const display = hover || rating;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: "relative", background: `linear-gradient(135deg, ${C.bgCard}, #1a2d42)`,
        border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 24, padding: 28,
        width: "100%", maxWidth: 420, maxHeight: "calc(100dvh - 40px)", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 2 }}>
              Marcar como visto
            </h3>
            <p style={{ fontSize: 12, color: C.textMuted }}>Como foi?</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
        </div>

        {/* Movie info */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
          <div style={{ width: 56, height: 84, borderRadius: 10, overflow: "hidden", background: C.bgDeep, flexShrink: 0, border: `1px solid ${C.border}` }}>
            {movie.poster_url
              ? <img src={movie.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}><Film size={18} /></div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{movie.title}</p>
            <p style={{ fontSize: 12, color: C.textMuted }}>Avalie de 0,5 a 5 estrelas</p>
            {existingRating && (
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: `rgba(201,168,76,0.12)`, border: `1px solid rgba(201,168,76,0.25)` }}>
                <Star size={10} fill={C.gold} color={C.gold} />
                <span style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>Nota atual: {Number(existingRating.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stars */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(i => {
            const full = display >= i, half = !full && display >= i - 0.5;
            return (
              <div key={i} style={{ position: "relative", width: 40, height: 40, cursor: "pointer" }} onMouseLeave={() => setHover(0)}>
                <div onMouseEnter={() => setHover(i - 0.5)} onClick={() => setRating(i - 0.5)} style={{ position: "absolute", inset: 0, width: "50%", zIndex: 2 }} />
                <div onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "50%", zIndex: 2 }} />
                <Star size={40} style={{ color: full || half ? C.gold : "#2a3d50", fill: full ? C.gold : "transparent", filter: full ? `drop-shadow(0 0 8px ${C.gold}66)` : "none", transition: "all 0.15s" }} />
                {half && (
                  <div style={{ position: "absolute", inset: 0, overflow: "hidden", width: "50%", pointerEvents: "none" }}>
                    <Star size={40} style={{ color: C.gold, fill: C.gold }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: "center", color: display ? C.gold : C.textMuted, fontSize: 14, fontWeight: 600, marginBottom: 24, fontFamily: "'Outfit', sans-serif" }}>
          {display ? `${display.toFixed(1)} / 5.0` : "Selecione uma nota"}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 12, background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: "unset" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || !rating} style={{ padding: "10px 22px", borderRadius: 12, background: rating ? `linear-gradient(135deg, ${C.goldDim}, ${C.gold})` : C.bgCard, color: rating ? C.bgDeep : C.textDim, fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif", border: "none", cursor: rating ? "pointer" : "not-allowed", opacity: saving ? 0.7 : 1, minHeight: "unset", display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? <><Spinner size={14} /> Salvando...</> : <><Check size={14} /> {existingRating ? "Atualizar" : "Confirmar"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Item ───────────────────────────────────────
function ActivityItem({ entry, onOpenMovie }) {
  const name = entry.profile?.display_name || "Membro";
  const ini = name.slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 14px", borderRadius: 14,
      background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`,
      alignItems: "center", transition: "all 0.2s",
    }} className="card-hover">
      <div style={{
        width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        background: entry.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
        border: `2px solid rgba(201,168,76,0.3)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: C.bgDeep,
      }}>
        {entry.profile?.avatar_url
          ? <img src={entry.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : ini}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700 }}>{name}</span>
          <span style={{ color: C.textMuted }}> assistiu </span>
          <button onClick={() => onOpenMovie(entry)} style={{ background: "none", border: "none", padding: 0, color: C.gold, fontWeight: 600, cursor: "pointer", minHeight: "unset", minWidth: "unset", fontSize: 13 }}>
            {entry.title || "filme"}
          </button>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={9} style={{ color: s <= Math.ceil(Number(entry.rating)) ? C.gold : "#2a3d50", fill: s <= Math.ceil(Number(entry.rating)) ? C.gold : "transparent" }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{Number(entry.rating).toFixed(1)}</span>
          <span style={{ fontSize: 10, color: C.textDim }}>·</span>
          <span style={{ fontSize: 10, color: C.textDim }}>{timeAgo(entry.created_at)}</span>
        </div>
      </div>
      {entry.poster_url && (
        <button onClick={() => onOpenMovie(entry)} style={{ width: 34, height: 50, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: C.bgCard, border: "none", padding: 0, cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>
          <img src={entry.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </button>
      )}
    </div>
  );
}

// ─── Add Movie Modal ─────────────────────────────────────
function AddMovieModal({ movieSearch, setMovieSearch, movieResults, movieSearchLoading, onAdd, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", background: `linear-gradient(135deg, ${C.bgCard}, #1a2d42)`, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 24, padding: 28, width: "100%", maxWidth: 500, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>Adicionar Filme</h3>
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Busque e adicione à curadoria</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
        </div>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input value={movieSearch} onChange={e => setMovieSearch(e.target.value)} placeholder="Buscar filme..." autoFocus style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(9,21,35,0.7)", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none" }} onFocus={e => (e.target.style.borderColor = C.gold)} onBlur={e => (e.target.style.borderColor = C.border)} />
          {movieSearchLoading && <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}><Spinner size={16} /></div>}
        </div>
        {movieSearchLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Spinner size={24} /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {movieResults.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.2s" }} className="card-hover" onClick={() => { onAdd(m); onClose(); }}>
                <div style={{ width: 40, height: 60, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: C.bgCard }}>
                  {m.poster_path ? <img src={tmdb.poster(m.poster_path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Film size={18} style={{ margin: "auto", display: "block", marginTop: 20, opacity: 0.3 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{m.title}</p>
                  <p style={{ fontSize: 11, color: C.textDim }}>{m.release_date?.slice(0, 4)}</p>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Plus size={14} style={{ color: C.bgDeep }} />
                </div>
              </div>
            ))}
            {!movieSearchLoading && !movieResults.length && movieSearch && (
              <p style={{ textAlign: "center", color: C.textDim, padding: "20px 0", fontSize: 13 }}>Nenhum resultado para "{movieSearch}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Invite Modal ────────────────────────────────────────
function InviteModal({ friendProfiles, onInvite, onCopyLink, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} />
      <div style={{ position: "relative", background: `linear-gradient(135deg, ${C.bgCard}, #1a2d42)`, border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 24, padding: 28, width: "100%", maxWidth: 500, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>Convidar Amigos</h3>
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Expanda a curadoria do seu club</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
        </div>
        <button onClick={onCopyLink} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 14, background: `linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.06))`, border: `1px solid rgba(201,168,76,0.3)`, cursor: "pointer", marginBottom: 16, minHeight: "unset" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(201,168,76,0.15)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Link2 size={16} style={{ color: C.gold }} />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Copiar link do club</p>
            <p style={{ fontSize: 11, color: C.textMuted }}>Qualquer pessoa pode entrar pelo link</p>
          </div>
          <ArrowRight size={14} style={{ color: C.gold }} />
        </button>
        {friendProfiles.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friendProfiles.map(fp => {
              const ini = (fp.display_name || "?").slice(0, 2).toUpperCase();
              return (
                <div key={fp.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", background: fp.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.bgDeep, flexShrink: 0 }}>
                    {fp.avatar_url ? <img src={fp.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{fp.display_name || "Sem nome"}</p>
                    {fp.username && <p style={{ fontSize: 11, color: C.gold }}>@{fp.username}</p>}
                  </div>
                  <button onClick={() => onInvite(fp.user_id)} style={{ padding: "7px 14px", borderRadius: 10, background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`, color: C.bgDeep, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", minHeight: "unset", fontFamily: "'Outfit', sans-serif" }}>Convidar</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "28px 0", color: C.textDim }}>
            <Users size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
            <p style={{ fontSize: 13 }}>Nenhum amigo disponível para convidar</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Adicione amigos primeiro na aba Social</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Movie Card do Club ──────────────────────────────────
function ClubMovieCard({ mv, myRating, isMine, userId, onOpen, onWatch, onRemove }) {
  const watched = !!myRating;
  return (
    <div style={{ position: "relative" }} className="movie-card-netflix">
      <div onClick={() => onOpen(mv)} style={{ cursor: "pointer" }}>
        <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden", background: C.bgCard, border: `1px solid ${C.border}`, position: "relative" }}>
          {mv.poster_url
            ? <img src={mv.poster_url} alt={mv.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.2 }}><Film size={28} /></div>
          }
          {/* Watched badge */}
          {watched && (
            <div style={{ position: "absolute", top: 7, left: 7, padding: "3px 7px", borderRadius: 7, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)", color: C.gold, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, border: `1px solid rgba(201,168,76,0.4)` }}>
              <Eye size={9} /> {Number(myRating.rating).toFixed(1)}
            </div>
          )}
          {/* Remove own movie */}
          {isMine && (
            <button onClick={e => { e.stopPropagation(); onRemove(mv.id); }} style={{ position: "absolute", top: 7, right: 7, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", color: "#ef4444", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}>✕</button>
          )}
          {/* Gradient overlay */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", pointerEvents: "none" }} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 500, color: C.text, marginTop: 6, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{mv.title}</p>
      </div>
      {!isMine && (
        <button onClick={e => { e.stopPropagation(); onWatch(mv); }} style={{ marginTop: 5, width: "100%", padding: "7px 6px", borderRadius: 9, background: watched ? "rgba(201,168,76,0.1)" : `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`, color: watched ? C.gold : C.bgDeep, border: watched ? `1px solid rgba(201,168,76,0.3)` : "none", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, minHeight: "unset", minWidth: "unset", fontFamily: "'Outfit', sans-serif", transition: "all 0.18s" }}>
          <Eye size={11} /> {watched ? "Reavaliar" : "Marcar visto"}
        </button>
      )}
    </div>
  );
}

// ─── Main GroupPage ──────────────────────────────────────
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
  const [activeTab, setActiveTab] = useState("movies");
  const debRef = useRef(null);

  // Stats
  const totalMovies = movies.length;
  const totalWatched = movies.filter(m => !!getRating(m.tmdb_id)).length;
  const totalActivity = activity.length;

  useEffect(() => {
    if (!showInvite || !friends.length || !userId) return;
    const friendIds = friends.map(f => f.user_a_id === userId ? f.user_b_id : f.user_a_id);
    const existingMemberIds = members.map(m => m.user_id);
    const invitableIds = friendIds.filter(id => !existingMemberIds.includes(id));
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
      toast.success(`"${movie.title}" adicionado!`);
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

  const openMovieFromEntry = (entry) => {
    setSelectedMovie({ tmdbId: entry.tmdb_id, title: entry.title, poster: entry.poster_url });
    setPage("movie");
  };

  const moviesByUser = {};
  movies.forEach(m => { if (!moviesByUser[m.user_id]) moviesByUser[m.user_id] = []; moviesByUser[m.user_id].push(m); });

  const MemberAvatar = ({ member, size = 40 }) => {
    const ini = (member.profile?.display_name || "?").slice(0, 2).toUpperCase();
    return (
      <div title={member.profile?.display_name || "Membro"} style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: member.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.28, fontWeight: 700, color: C.bgDeep, flexShrink: 0 }}>
        {member.profile?.avatar_url ? <img src={member.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
      </div>
    );
  };

  if (!clubId) return null;

  // ─── SHARED CONTENT BLOCKS ───
  const HeroSection = () => (
    <div style={{
      position: "relative",
      background: `linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(15,25,35,0.5) 50%, rgba(79,70,229,0.1) 100%)`,
      border: `1px solid rgba(201,168,76,0.25)`,
      borderRadius: 24,
      padding: "24px 22px 20px",
      marginBottom: 24,
      overflow: "hidden",
    }}>
      {/* Film strip top */}
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: `repeating-linear-gradient(90deg, transparent 0 12px, rgba(201,168,76,0.4) 12px 16px)`, opacity: 0.7 }} />
      {/* Film strip bottom */}
      <div aria-hidden style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 12, background: `repeating-linear-gradient(90deg, transparent 0 12px, rgba(201,168,76,0.4) 12px 16px)`, opacity: 0.7 }} />

      {/* Back button */}
      <button onClick={() => setPage("groups")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", marginBottom: 14, cursor: "pointer", minHeight: "unset", minWidth: "unset", transition: "all 0.2s" }}>
        <ChevronLeft size={14} /> Meus Clubs
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Mascot */}
        <img src={mascotDirector} alt="" style={{ width: 72, height: 72, objectFit: "contain", filter: `drop-shadow(0 6px 18px ${C.gold}55)`, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, background: `rgba(201,168,76,0.14)`, border: `1px solid rgba(201,168,76,0.3)`, marginBottom: 8 }}>
            <Sparkles size={10} style={{ color: C.gold }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Curadoria coletiva</span>
          </div>

          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 900, color: C.text, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 4 }}>
            {club?.name || "…"}
          </h1>
          {club?.description && (
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{club.description}</p>
          )}
        </div>
      </div>

      {/* Member avatars row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>
          {members.slice(0, 6).map((m, i) => (
            <div key={m.user_id} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: 6 - i }}>
              <MemberAvatar member={m} size={32} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
            {members.map(m => m.profile?.display_name || "Membro").slice(0, 3).join(", ")}
            {members.length > 3 && ` +${members.length - 3}`}
          </p>
          <p style={{ fontSize: 11, color: C.textMuted }}>{members.length} membro{members.length !== 1 ? "s" : ""}</p>
        </div>
        {/* Owner chip */}
        {club?.created_by === userId && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, background: `rgba(201,168,76,0.12)`, border: `1px solid rgba(201,168,76,0.3)`, fontSize: 10, fontWeight: 700, color: C.gold }}>
            <Crown size={10} /> Dono
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Filmes", value: totalMovies, icon: <Film size={12} /> },
          { label: "Vistos", value: totalWatched, icon: <Eye size={12} /> },
          { label: "Atividades", value: totalActivity, icon: <Activity size={12} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ background: "rgba(15,25,35,0.5)", border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 12, padding: "10px 12px", backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.textDim, marginBottom: 3 }}>
              {icon}
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
            </div>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setShowAddMovie(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 12, background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`, color: C.bgDeep, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", minHeight: "unset", fontFamily: "'Outfit', sans-serif", boxShadow: `0 4px 18px rgba(201,168,76,0.3)` }}>
          <Plus size={14} /> Adicionar Filme
        </button>
        <button onClick={() => setShowInvite(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 12, background: C.bgCard, color: C.textMuted, fontSize: 12, fontWeight: 600, border: `1px solid ${C.border}`, cursor: "pointer", minHeight: "unset", transition: "all 0.2s" }}>
          <Users size={13} /> Convidar
        </button>
        <button onClick={handleCopyInviteLink} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 12, background: C.bgCard, color: C.textMuted, fontSize: 12, fontWeight: 600, border: `1px solid ${C.border}`, cursor: "pointer", minHeight: "unset", transition: "all 0.2s" }}>
          <Link2 size={13} /> Link
        </button>
      </div>
    </div>
  );

  const MoviesContent = () => (
    <div>
      {movies.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.95))`, border: `1px dashed ${C.border}`, borderRadius: 20 }}>
          <img src={monkeyPopcorn} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 14, opacity: 0.7, filter: `drop-shadow(0 6px 16px ${C.gold}33)` }} />
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Nenhum filme ainda</p>
          <p style={{ fontSize: 13, color: C.textDim, marginBottom: 20, lineHeight: 1.5 }}>Seja o primeiro a adicionar um filme à curadoria do club!</p>
          <button onClick={() => setShowAddMovie(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 12, background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`, color: C.bgDeep, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", minHeight: "unset", fontFamily: "'Outfit', sans-serif" }}>
            <Plus size={14} /> Adicionar primeiro filme
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {members.map(member => {
            const memberMovies = moviesByUser[member.user_id] || [];
            if (!memberMovies.length) return null;
            const ini = (member.profile?.display_name || "?").slice(0, 2).toUpperCase();
            return (
              <div key={member.user_id}>
                {/* Member header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid rgba(30,51,71,0.6)` }}>
                  <MemberAvatar member={member} size={38} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: C.text }}>{member.profile?.display_name || "Membro"}</h3>
                      {member.role === "owner" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 999, background: `rgba(201,168,76,0.12)`, border: `1px solid rgba(201,168,76,0.25)`, fontSize: 9, fontWeight: 700, color: C.gold }}>
                          <Crown size={8} /> DONO
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: C.textMuted }}>{memberMovies.length} filme{memberMovies.length !== 1 ? "s" : ""} adicionados</p>
                  </div>
                </div>

                {/* Movies grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                  {memberMovies.map(mv => (
                    <ClubMovieCard
                      key={mv.id}
                      mv={mv}
                      myRating={getRating(mv.tmdb_id)}
                      isMine={mv.user_id === userId}
                      userId={userId}
                      onOpen={(m) => { setSelectedMovie({ tmdbId: m.tmdb_id, title: m.title, poster: m.poster_url }); setPage("movie"); }}
                      onWatch={setWatchTarget}
                      onRemove={removeMovie}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const ActivityContent = () => (
    <div>
      {activity.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.95))`, border: `1px dashed ${C.border}`, borderRadius: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Activity size={26} style={{ color: C.textDim }} />
          </div>
          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>Nenhuma atividade ainda</p>
          <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>Marque filmes como vistos para começar o histórico!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {activity.map(entry => (
            <ActivityItem key={entry.id} entry={entry} onOpenMovie={openMovieFromEntry} />
          ))}
        </div>
      )}
    </div>
  );

  // ─── MOBILE LAYOUT ─────────────────────────────────────
  const isMobileView = typeof window !== "undefined" && window.innerWidth <= 767;

  if (isMobileView) {
    return (
      <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 100, position: "relative", overflow: "hidden" }}>
        {/* Ambient glows */}
        <div aria-hidden style={{ position: "fixed", top: -100, left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}18, transparent 65%)`, filter: "blur(50px)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, padding: "0 16px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={36} /></div>
          ) : (
            <>
              <HeroSection />

              {/* Tab pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
                {[
                  { id: "movies", label: `Filmes (${totalMovies})`, icon: <Film size={13} /> },
                  { id: "activity", label: `Atividade (${totalActivity})`, icon: <Activity size={13} /> },
                ].map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, background: activeTab === id ? `linear-gradient(135deg, ${C.goldDim}, ${C.gold})` : C.bgCard, color: activeTab === id ? C.bgDeep : C.textMuted, border: activeTab === id ? "none" : `1px solid ${C.border}`, cursor: "pointer", minHeight: "unset", transition: "all 0.2s" }}>
                    {icon} {label}
                  </button>
                ))}
              </div>

              {activeTab === "movies" && <MoviesContent />}
              {activeTab === "activity" && <ActivityContent />}
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

  // ─── DESKTOP LAYOUT ────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingTop: 72, paddingBottom: 60, position: "relative", overflow: "hidden" }}>
      {/* Ambient glows */}
      <div aria-hidden style={{ position: "fixed", top: -150, left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}18, transparent 60%)`, filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", bottom: -200, right: -100, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, rgba(79,70,229,0.15), transparent 65%)`, filter: "blur(70px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={38} /></div>
        ) : (
          <>
            <HeroSection />

            {/* Two-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

              {/* Left: Movies */}
              <div>
                {/* Section label */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <Clapperboard size={16} style={{ color: C.gold }} />
                  <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Curadoria</h2>
                  <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)` }} />
                  <span style={{ fontSize: 12, color: C.textDim }}>{totalMovies} filmes</span>
                </div>

                <MoviesContent />
              </div>

              {/* Right: Activity sidebar */}
              <div style={{ position: "sticky", top: 88 }}>
                {/* Activity panel */}
                <div style={{ background: `linear-gradient(155deg, ${C.bgCard} 0%, rgba(15,25,35,0.95) 100%)`, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden" }}>
                  {/* Panel header */}
                  <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid rgba(30,51,71,0.6)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Activity size={14} style={{ color: C.gold }} />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: C.text }}>Atividade</h3>
                        <p style={{ fontSize: 10, color: C.textDim }}>últimas avaliações</p>
                      </div>
                    </div>
                    {totalActivity > 0 && (
                      <div style={{ padding: "3px 8px", borderRadius: 999, background: `rgba(201,168,76,0.12)`, border: `1px solid rgba(201,168,76,0.25)`, fontSize: 11, fontWeight: 700, color: C.gold }}>
                        {totalActivity}
                      </div>
                    )}
                  </div>

                  {/* Activity list */}
                  <div style={{ padding: "14px 16px", maxHeight: "calc(100vh - 340px)", overflowY: "auto", scrollbarWidth: "none" }}>
                    {activity.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "28px 12px" }}>
                        <Clock size={28} style={{ color: C.textDim, marginBottom: 10 }} />
                        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>Ninguém marcou filmes ainda. Seja o primeiro!</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {activity.map(entry => (
                          <ActivityItem key={entry.id} entry={entry} onOpenMovie={openMovieFromEntry} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Members panel */}
                <div style={{ marginTop: 16, background: `linear-gradient(155deg, ${C.bgCard} 0%, rgba(15,25,35,0.95) 100%)`, border: `1px solid ${C.border}`, borderRadius: 20, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={14} style={{ color: C.gold }} />
                    </div>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: C.text }}>Membros</h3>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: C.textDim }}>{members.length} total</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {members.map(m => {
                      const ini = (m.profile?.display_name || "?").slice(0, 2).toUpperCase();
                      const memberMovieCount = (moviesByUser[m.user_id] || []).length;
                      return (
                        <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: m.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.bgDeep, flexShrink: 0 }}>
                            {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.profile?.display_name || "Membro"}</p>
                              {m.role === "owner" && <Crown size={10} style={{ color: C.gold, flexShrink: 0 }} />}
                            </div>
                            <p style={{ fontSize: 10, color: C.textDim }}>{memberMovieCount} filme{memberMovieCount !== 1 ? "s" : ""} adicionados</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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
