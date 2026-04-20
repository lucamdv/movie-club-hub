// @ts-nocheck
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { C, MOCK_REVIEWS, MOCK_USERS } from "../foundation";
import { UserRound, ChevronDown, Share2, Info, Play, Star as StarIcon, Bookmark, BookmarkCheck, Heart, ChevronLeft, X } from "lucide-react";
import { Spinner, StarRating, Avatar, Badge, Btn, Section, StreamingBadges, RatingsRow } from "../ui";
import { useMovieDetails, useRatings, useWatchlist } from "../hooks";

// ─── Mobile Rating Sheet ──────────────────────────────────
function RatingSheet({ movie, existingRating, onSave, onRemove, onClose }) {
  const [localRating, setLocalRating] = useState(existingRating ? Number(existingRating.rating) : 0);
  const [review, setReview] = useState(existingRating?.review || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!localRating) return;
    setSaving(true);
    try {
      await onSave(localRating, review);
      onClose();
    } catch { setSaving(false); }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />
        <div style={{ paddingBottom: 8 }}>
          {/* Movie header */}
          <div style={{ display: "flex", gap: 14, marginBottom: 24, alignItems: "center" }}>
            {movie.poster && (
              <img src={movie.poster} alt={movie.title} style={{ width: 52, height: 78, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}` }} />
            )}
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>{movie.title}</p>
              <p style={{ fontSize: 13, color: C.textMuted }}>{movie.year} · {movie.genre}</p>
              {existingRating && (
                <p style={{ fontSize: 12, color: C.gold, marginTop: 2 }}>Sua nota atual: {Number(existingRating.rating).toFixed(1)} ★</p>
              )}
            </div>
          </div>

          {/* Stars */}
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {existingRating ? "Atualizar avaliação" : "Sua avaliação"}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setLocalRating(s)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, transition: "transform 0.15s", transform: localRating >= s ? "scale(1.2)" : "scale(1)", minHeight: "unset", minWidth: "unset" }}
              >
                <StarIcon
                  size={36}
                  fill={localRating >= s ? C.gold : "transparent"}
                  stroke={localRating >= s ? C.gold : C.textDim}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>

          {/* Review */}
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Escreva sua review (opcional)…"
            rows={3}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, fontSize: 15, resize: "none", outline: "none", fontFamily: "inherit" }}
            onFocus={(e) => (e.target.style.borderColor = C.gold)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {existingRating && (
              <button
                onClick={async () => { await onRemove(); onClose(); }}
                style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.3)`, color: C.red, fontSize: 14, fontWeight: 600, minHeight: "unset", minWidth: "unset" }}
              >
                Remover
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!localRating || saving}
              style={{ flex: 1, padding: "14px", borderRadius: 12, background: localRating ? `linear-gradient(135deg, ${C.goldDim}, ${C.gold})` : C.bgCard, color: localRating ? C.bgDeep : C.textDim, fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', sans-serif", border: "none", minHeight: "unset", transition: "all 0.2s", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Salvando…" : existingRating ? "Atualizar" : "Avaliar"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── MoviePage ────────────────────────────────────────────
export function MoviePage({ movieInit, setPage, setSelectedMovie, auth: authCtx, isMobile }) {
  const { movie, loading, streamServices } = useMovieDetails(movieInit?.tmdbId || movieInit?.id);
  const m = movie || movieInit;
  const [liked, setLiked] = useState(false);
  const [showRatingSheet, setShowRatingSheet] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [castExpanded, setCastExpanded] = useState(false);
  const { upsertRating, getRating, deleteRating } = useRatings(authCtx?.user?.id);
  const { isInList, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist(authCtx?.user?.id);
  const existingRating = m ? getRating(m.tmdbId || m.id) : null;
  const inWatchlist = m ? isInList(m.tmdbId || m.id) : false;

  if (loading && !m) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ textAlign: "center" }}>
        <Spinner size={38} />
        <p style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Carregando…</p>
      </div>
    </div>
  );
  if (!m) return null;

  const reviews = MOCK_REVIEWS.filter((r) => r.movieTmdbId === m.tmdbId).map(
    (r) => ({ ...r, user: MOCK_USERS.find((u) => u.id === r.userId) })
  );

  // ── MOBILE LAYOUT ─────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: "calc(var(--bottom-nav-height, 64px) + var(--safe-bottom, 0px) + 24px)", overflowX: "hidden", width: "100%" }}>

        {/* Hero backdrop + back button */}
        <div style={{ position: "relative", height: "min(260px, 38dvh)", minHeight: 200, overflow: "hidden" }}>
          {m.backdrop ? (
            <img src={m.backdrop} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
          ) : m.poster ? (
            <img src={m.posterHD || m.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.3, filter: "blur(8px)", transform: "scale(1.1)" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, #0a1e34, #1a2d48)` }} />
          )}
          {/* Top gradient */}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(15,25,35,0.55) 0%, transparent 35%, ${C.bg} 100%)` }} />

          {/* Back button */}
          <button
            onClick={() => setPage("home")}
            style={{ position: "absolute", top: "calc(var(--safe-top, 0px) + 12px)", left: 14, width: 40, height: 40, borderRadius: "50%", background: "rgba(9,21,35,0.78)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `1px solid rgba(255,255,255,0.14)`, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, minHeight: "unset", minWidth: "unset", padding: 0 }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Share */}
          <button
            onClick={() => { if (navigator.share) navigator.share({ title: m.title, url: window.location.href }); }}
            style={{ position: "absolute", top: "calc(var(--safe-top, 0px) + 12px)", right: 14, width: 40, height: 40, borderRadius: "50%", background: "rgba(9,21,35,0.78)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `1px solid rgba(255,255,255,0.14)`, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, minHeight: "unset", minWidth: "unset", padding: 0 }}
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Poster + Info header — overlaps hero */}
        <div style={{ margin: "-70px 14px 0", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 14 }}>
            {/* Poster */}
            <div style={{ width: 104, height: 156, borderRadius: 12, overflow: "hidden", flexShrink: 0, boxShadow: "0 14px 44px rgba(0,0,0,0.75)", border: `2px solid ${C.border}`, background: C.bgCard }}>
              {m.poster && <img src={m.posterHD || m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>

            {/* Quick info */}
            <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                {(m.genres?.length ? m.genres : [m.genre]).slice(0, 2).map((g) => (
                  <span key={g} style={{ fontSize: 10, fontWeight: 600, color: C.goldDim, background: "rgba(201,168,76,0.1)", padding: "2px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{g}</span>
                ))}
              </div>
              <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 19, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 6, wordBreak: "break-word" }}>{m.title}</h1>
              {m.tagline && <p style={{ fontSize: 11, color: C.gold, fontStyle: "italic", marginBottom: 6, opacity: 0.85, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>"{m.tagline}"</p>}
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {m.year && <span style={{ fontSize: 12, color: C.textMuted }}>{m.year}</span>}
                {m.runtime && <span style={{ fontSize: 12, color: C.textDim }}>·</span>}
                {m.runtime && <span style={{ fontSize: 12, color: C.textMuted }}>{m.runtime} min</span>}
                {m.rated && <span style={{ fontSize: 10, color: C.textDim, border: `1px solid ${C.border}`, padding: "1px 5px", borderRadius: 4 }}>{m.rated}</span>}
              </div>
            </div>
          </div>

          {/* Ratings row */}
          {(m.rating || m.imdbRating || m.rottenTomatoes) && (
            <div style={{ marginBottom: 14 }}>
              <RatingsRow movie={m} />
            </div>
          )}

          {/* Action bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {/* Rate */}
            <button
              onClick={() => setShowRatingSheet(true)}
              style={{
                flex: 1,
                padding: "11px 4px",
                minWidth: 0,
                borderRadius: 14,
                background: existingRating ? `linear-gradient(135deg, ${C.goldDim}60, ${C.gold}60)` : C.bgCard,
                border: `1px solid ${existingRating ? C.gold : C.border}`,
                color: existingRating ? C.gold : C.textMuted,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                minHeight: "unset",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <StarIcon size={17} fill={existingRating ? C.gold : "none"} stroke={existingRating ? C.gold : C.textMuted} />
              {existingRating ? `${Number(existingRating.rating).toFixed(1)} ★` : "Avaliar"}
            </button>

            {/* Watchlist */}
            <button
              onClick={() => { const id = m.tmdbId || m.id; inWatchlist ? removeFromWatchlist(id) : addToWatchlist(id, m.title, m.poster); }}
              style={{
                flex: 1,
                padding: "11px 4px",
                minWidth: 0,
                borderRadius: 14,
                background: inWatchlist ? "rgba(34,197,94,0.12)" : C.bgCard,
                border: `1px solid ${inWatchlist ? "#22C55E" : C.border}`,
                color: inWatchlist ? "#22C55E" : C.textMuted,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                minHeight: "unset",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {inWatchlist ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
              {inWatchlist ? "Salvo" : "Salvar"}
            </button>

            {/* Curtir */}
            <button
              onClick={() => setLiked((l) => !l)}
              style={{
                flex: 1,
                padding: "11px 4px",
                minWidth: 0,
                borderRadius: 14,
                background: liked ? "rgba(239,68,68,0.12)" : C.bgCard,
                border: `1px solid ${liked ? C.red : C.border}`,
                color: liked ? C.red : C.textMuted,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                minHeight: "unset",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <Heart size={17} fill={liked ? C.red : "none"} stroke={liked ? C.red : C.textMuted} />
              Curtir
            </button>

            {/* Trailer */}
            {m.trailer && (
              <a
                href={`https://youtube.com/watch?v=${m.trailer}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: "11px 4px",
                  minWidth: 0,
                  borderRadius: 14,
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  color: C.textMuted,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <Play size={17} />
                Trailer
              </a>
            )}
          </div>

          {/* Onde assistir */}
          {streamServices.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: C.textDim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>Onde assistir</p>
              <StreamingBadges services={streamServices} loading={loading && !streamServices.length} />
            </div>
          )}

          {/* Sinopse */}
          <div style={{ background: C.bgCard, borderRadius: 16, padding: "14px 16px", marginBottom: 14, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Sinopse</p>
            <p style={{
              fontSize: 14,
              color: C.textMuted,
              lineHeight: 1.7,
              display: showFullOverview ? "block" : "-webkit-box",
              WebkitLineClamp: showFullOverview ? "unset" : 3,
              WebkitBoxOrient: "vertical",
              overflow: showFullOverview ? "visible" : "hidden",
            }}>
              {m.plot || m.overview}
            </p>
            {(m.plot || m.overview)?.length > 150 && (
              <button
                onClick={() => setShowFullOverview((v) => !v)}
                style={{ marginTop: 6, fontSize: 12, color: C.gold, fontWeight: 600, background: "none", border: "none", display: "flex", alignItems: "center", gap: 3, minHeight: "unset", minWidth: "unset" }}
              >
                {showFullOverview ? "Ver menos" : "Ver mais"} <ChevronDown size={14} style={{ transform: showFullOverview ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
            )}
          </div>

          {/* Direção + Elenco */}
          {(m.director || m.cast?.length > 0) && (
            <div style={{ background: C.bgCard, borderRadius: 16, padding: "14px 16px", marginBottom: 14, border: `1px solid ${C.border}` }}>
              {m.director && (
                <div style={{ marginBottom: m.cast?.length ? 12 : 0 }}>
                  <p style={{ fontSize: 11, color: C.textDim, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Direção</p>
                  <p style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{m.director}</p>
                </div>
              )}
              {m.cast?.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, color: C.textDim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Elenco</p>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", overflowY: "hidden", paddingBottom: 4, scrollbarWidth: "none", margin: "0 -16px", padding: "0 16px 4px", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}>
                    {(castExpanded ? m.cast : m.cast.slice(0, 6)).map((actor) => (
                      <div key={actor.id} style={{ textAlign: "center", flexShrink: 0, width: 60 }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", margin: "0 auto 5px", background: C.bgDeep, border: `2px solid ${C.border}` }}>
                          {actor.photo ? (
                            <img src={actor.photo} alt={actor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}><UserRound size={18} /></div>
                          )}
                        </div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: C.text, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actor.name.split(" ")[0]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prêmios + Bilheteria */}
          {(m.awards || m.boxOffice) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {m.awards && (
                <div style={{ flex: 1, background: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: C.goldDim, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Prêmios</p>
                  <p style={{ fontSize: 12, color: C.gold, lineHeight: 1.4 }}>{m.awards}</p>
                </div>
              )}
              {m.boxOffice && (
                <div style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: C.textDim, marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>Bilheteria</p>
                  <p style={{ fontSize: 12, color: C.text }}>{m.boxOffice}</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Reviews da Comunidade</p>
              {reviews.map((r, i) => (
                <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Avatar user={r.user} size={32} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.user?.name}</p>
                      <p style={{ fontSize: 10, color: C.textDim }}>{r.date}</p>
                    </div>
                    <StarRating value={r.rating} size={12} />
                  </div>
                  <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, fontStyle: "italic" }}>"{r.text}"</p>
                </div>
              ))}
            </div>
          )}

          {/* Similares horizontal scroll */}
          {m.similar?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Similares</p>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", margin: "0 -14px", padding: "0 14px 4px", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain", scrollSnapType: "x proximity" }}>
                {m.similar.slice(0, 8).map((s) => (
                  <div key={s.id} onClick={() => { setSelectedMovie(s); }} style={{ flexShrink: 0, cursor: "pointer", width: 92, scrollSnapAlign: "start" }}>
                    <div style={{ height: 135, borderRadius: 10, overflow: "hidden", background: C.bgCard, border: `1px solid ${C.border}`, marginBottom: 5 }}>
                      {s.poster && <img src={s.poster} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <p style={{ fontSize: 11, color: C.text, lineHeight: 1.2, fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.title}</p>
                    {s.rating && <p style={{ fontSize: 10, color: C.gold }}>★ {s.rating}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rating Sheet */}
        {showRatingSheet && (
          <RatingSheet
            movie={m}
            existingRating={existingRating}
            onSave={async (rating, review) => {
              await upsertRating(m.tmdbId || m.id, rating, review, m.title, m.poster);
              toast.success(existingRating ? "Avaliação atualizada!" : "Avaliação publicada!");
            }}
            onRemove={async () => {
              await supabase.from("ratings").delete().eq("id", existingRating.id);
              toast.success("Avaliação removida");
            }}
            onClose={() => setShowRatingSheet(false)}
          />
        )}
      </div>
    );
  }

  // ── DESKTOP LAYOUT (original, mantido intacto) ────────
  return (
    <div style={{ paddingTop: 60, paddingBottom: 60, minHeight: "100dvh", overflowX: "hidden" }}>
      <div style={{ height: 420, position: "relative", overflow: "hidden" }}>
        {m.backdrop ? (
          <img src={m.backdrop} alt="" className="hero-backdrop" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,#0a1e34,#1a2d48)` }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${C.bg} 100%)` }} />
        <button
          onClick={() => setPage("home")}
          style={{ position: "absolute", top: 20, left: 28, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(9,21,35,0.7)", color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 13, zIndex: 1 }}
        >
          <ChevronLeft size={15} /> Voltar
        </button>
      </div>
      <div style={{ maxWidth: 1100, margin: "-200px auto 0", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 32, marginBottom: 40, alignItems: "flex-end" }}>
          <div style={{ width: 200, height: 300, borderRadius: 14, flexShrink: 0, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: `2px solid ${C.border}`, background: C.bgCard }}>
            {m.poster && <img src={m.posterHD || m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {(m.genres?.length ? m.genres : [m.genre]).slice(0, 4).map((g) => (
                <Badge key={g} color="rgba(201,168,76,0.10)" textColor={C.goldDim}>{g}</Badge>
              ))}
              {m.rated && <Badge color={C.bgCard} textColor={C.textDim}>{m.rated}</Badge>}
              {m.year && <Badge color={C.bgCard} textColor={C.textDim}>{m.year}</Badge>}
              {m.runtime && <Badge color={C.bgCard} textColor={C.textDim}>{m.runtime} min</Badge>}
            </div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 900, color: C.text, marginBottom: 4, lineHeight: 1.15 }}>{m.title}</h1>
            {m.tagline && <p style={{ color: C.gold, fontSize: 13, fontStyle: "italic", marginBottom: 14 }}>"{m.tagline}"</p>}
            <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
              {m.director && <div><span style={{ fontSize: 10, color: C.textDim, display: "block" }}>Direção</span><span style={{ fontSize: 13, color: C.textMuted }}>{m.director}</span></div>}
              {m.writer && <div><span style={{ fontSize: 10, color: C.textDim, display: "block" }}>Roteiro</span><span style={{ fontSize: 13, color: C.textMuted }}>{m.writer.split(",")[0]}</span></div>}
            </div>
            <div style={{ marginBottom: 16 }}><RatingsRow movie={m} /></div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: C.textDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Onde Assistir no Brasil</p>
              <StreamingBadges services={streamServices} loading={loading && !streamServices.length} />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn variant={inWatchlist ? "ghost" : "gold"} onClick={() => { const id = m.tmdbId || m.id; inWatchlist ? removeFromWatchlist(id) : addToWatchlist(id, m.title, m.poster); }}>
                {inWatchlist ? "✓ Na Watchlist" : "+ Minha Lista"}
              </Btn>
              <Btn variant="ghost" onClick={() => setShowRatingSheet(true)}>
                <StarIcon size={14} fill={existingRating ? C.gold : "none"} stroke={existingRating ? C.gold : "currentColor"} />
                {existingRating ? `${Number(existingRating.rating).toFixed(1)} ★` : "Avaliar"}
              </Btn>
              {m.trailer && (
                <a href={`https://youtube.com/watch?v=${m.trailer}`} target="_blank" rel="noopener noreferrer">
                  <Btn variant="ghost"><Play size={14} /> Trailer</Btn>
                </a>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 28 }}>
          <div>
            <Section title="Sinopse">
              <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.8 }}>{m.plot || m.overview}</p>
            </Section>
            {m.cast?.length > 0 && (
              <Section title="Elenco Principal">
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                  {m.cast.map((actor) => (
                    <div key={actor.id} style={{ textAlign: "center", flexShrink: 0, width: 78 }}>
                      <div style={{ width: 66, height: 66, borderRadius: "50%", overflow: "hidden", margin: "0 auto 6px", background: C.bgCard, border: `2px solid ${C.border}` }}>
                        {actor.photo ? <img src={actor.photo} alt={actor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}><UserRound size={20} /></div>}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.2 }}>{actor.name}</p>
                      <p style={{ fontSize: 10, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 78 }}>{actor.character}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            <Section title="Reviews da Comunidade">
              {reviews.map((r, i) => (
                <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={r.user} size={34} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.user?.name}</p>
                        <p style={{ fontSize: 11, color: C.textDim }}>{r.date}</p>
                      </div>
                    </div>
                    <StarRating value={r.rating} size={13} />
                  </div>
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, fontStyle: "italic" }}>"{r.text}"</p>
                </div>
              ))}
              {reviews.length === 0 && <p style={{ color: C.textDim, textAlign: "center", padding: 40 }}>Nenhuma review ainda.</p>}
            </Section>
          </div>
          <div>
            {[{ title: "Similares", data: m.similar }, { title: "Recomendados", data: m.recommendations }].map(({ title, data }) =>
              data?.length > 0 ? (
                <Section key={title} title={title}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.slice(0, 4).map((s) => (
                      <div key={s.id} onClick={() => { setSelectedMovie(s); }} style={{ display: "flex", gap: 10, cursor: "pointer", padding: 8, borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}>
                        <div style={{ width: 44, height: 66, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: C.bgDeep }}>
                          {s.poster && <img src={s.poster} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 2 }}>{s.title}</p>
                          <p style={{ fontSize: 11, color: C.textDim }}>{s.year}</p>
                          {s.rating && <p style={{ fontSize: 11, color: C.gold }}>★ {s.rating}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null
            )}
          </div>
        </div>
      </div>
      {showRatingSheet && (
        <RatingSheet
          movie={m}
          existingRating={existingRating}
          onSave={async (rating, review) => {
            await upsertRating(m.tmdbId || m.id, rating, review, m.title, m.poster);
            toast.success(existingRating ? "Avaliação atualizada!" : "Avaliação publicada!");
          }}
          onRemove={async () => {
            await supabase.from("ratings").delete().eq("id", existingRating.id);
            toast.success("Avaliação removida");
          }}
          onClose={() => setShowRatingSheet(false)}
        />
      )}
    </div>
  );
}
