// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { C, tmdb } from "../foundation";
import {
  Film, Star, Target, Award, Zap, Bookmark, Eye,
  ChevronLeft, ChevronRight, TrendingUp, Sparkles,
  SkipForward, X, Check,
} from "lucide-react";
import { Spinner, Btn } from "../ui";
import { useRatings, useUserPreferences, useWatchlist, applyPreferenceFilters } from "../hooks";

// ─── Cinematic star rating ───────────────────────────────
function CinematicStars({ value, onChange, size = 36 }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = display >= s;
        const halfFilled = !filled && display >= s - 0.5;
        return (
          <div key={s} style={{ position: "relative", cursor: "pointer" }}
            onMouseLeave={() => setHover(0)}>
            <div
              style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "50%", zIndex: 2 }}
              onMouseEnter={() => setHover(s - 0.5)}
              onClick={() => onChange(s - 0.5)}
            />
            <div
              style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", zIndex: 2 }}
              onMouseEnter={() => setHover(s)}
              onClick={() => onChange(s)}
            />
            <svg width={size} height={size} viewBox="0 0 24 24"
              style={{
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), filter 0.2s",
                transform: display >= s - 0.5 ? "scale(1.15)" : "scale(1)",
                filter: display >= s - 0.5
                  ? `drop-shadow(0 0 10px ${C.gold}cc)`
                  : "none",
              }}>
              <defs>
                <linearGradient id={`hg-${s}`}>
                  <stop offset="50%" stopColor={C.gold} />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill={filled ? C.gold : halfFilled ? `url(#hg-${s})` : "transparent"}
                stroke={display >= s - 0.5 ? C.gold : "#2a3d52"}
                strokeWidth="1.5"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

// ─── Session Summary ─────────────────────────────────────
function SessionSummary({ stats, idx, onNewSession, onHome, onMovieClick }) {
  const elapsed = stats.startTime ? Math.round((Date.now() - stats.startTime) / 60000) : 0;
  const avgRating = stats.rated.length > 0
    ? (stats.rated.reduce((s, r) => s + r.stars, 0) / stats.rated.length).toFixed(1)
    : "0";
  const distribution = [1, 2, 3, 4, 5].map((s) => stats.rated.filter((r) => Math.ceil(r.stars) === s).length);
  const maxDist = Math.max(...distribution, 1);

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}18, transparent 65%)`, filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 560, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${C.goldDim}33, ${C.gold}22)`,
            border: `2px solid ${C.gold}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Award size={34} style={{ color: C.gold }} />
          </div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 900, color: C.text, marginBottom: 4 }}>
            Sessão Finalizada!
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            {elapsed > 0 ? `${elapsed} minuto${elapsed !== 1 ? "s" : ""} de avaliações` : "Sessão relâmpago"}
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { val: stats.rated.length, label: "Avaliados", icon: Star, color: C.gold },
            { val: stats.watchlistAdded.length, label: "Na Lista", icon: Bookmark, color: "#22C55E" },
            { val: idx + 1, label: "Vistos", icon: Eye, color: "#818CF8" },
          ].map(({ val, label, icon: Icon, color }) => (
            <div key={label} style={{
              padding: "18px 12px", borderRadius: 16, textAlign: "center",
              background: `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.9))`,
              border: `1px solid rgba(255,255,255,0.06)`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.2)`,
            }}>
              <Icon size={18} style={{ color, marginBottom: 6 }} />
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Rating distribution */}
        {stats.rated.length > 0 && (
          <div style={{
            padding: 20, borderRadius: 18,
            background: `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.9))`,
            border: `1px solid rgba(255,255,255,0.06)`,
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>Nota Média da Sessão</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Star size={15} fill={C.gold} stroke={C.gold} />
                <span style={{ color: C.gold, fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{avgRating}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 56 }}>
              {distribution.map((count, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: "100%", borderRadius: 4,
                    height: Math.max((count / maxDist) * 44, 3),
                    background: count > 0 ? `linear-gradient(to top, ${C.goldDim}, ${C.gold})` : "#1e3347",
                    transition: "height 0.5s ease",
                  }} />
                  <span style={{ fontSize: 10, color: C.textDim }}>{i + 1}★</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rated movies list */}
        {stats.rated.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Filmes Avaliados
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {stats.rated.map((r) => (
                <div key={r.id}
                  onClick={() => onMovieClick(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    borderRadius: 12, background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.18s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = C.gold + "44"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}
                >
                  {r.poster && <img src={r.poster} alt="" style={{ width: 32, height: 48, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                  <span style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: 500 }}>{r.title}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={11} fill={C.gold} stroke={C.gold} />
                    <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{r.stars}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onNewSession} style={{
            padding: "12px 28px", borderRadius: 14,
            background: "transparent", border: `1.5px solid ${C.border}`,
            color: C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.18s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
          >
            Nova Sessão
          </button>
          <button onClick={onHome} style={{
            padding: "12px 28px", borderRadius: 14,
            background: `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
            color: C.bgDeep, fontSize: 14, fontWeight: 700,
            fontFamily: "'Outfit', sans-serif", border: "none", cursor: "pointer",
          }}>
            Início
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mode Selection Screen ────────────────────────────────
function ModeSelect({ onStart, hasRatings, defaultMode }) {
  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      {/* Background glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}12, transparent 60%)`, filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, width: "100%", textAlign: "center" }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px",
          background: `linear-gradient(135deg, ${C.goldDim}44, ${C.gold}22)`,
          border: `1.5px solid ${C.gold}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 8px 32px ${C.gold}22`,
        }}>
          <Zap size={32} style={{ color: C.gold }} />
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px",
          borderRadius: 999, background: `rgba(201,168,76,0.12)`,
          border: `1px solid rgba(201,168,76,0.3)`, marginBottom: 14,
        }}>
          <Sparkles size={10} style={{ color: C.gold }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Modo Rápido
          </span>
        </div>

        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 900, color: C.text, marginBottom: 16, lineHeight: 1.1 }}>
          Avaliação Rápida
        </h1>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 450, color: C.text, marginBottom: 8, lineHeight: 1.1 }}>
          Deslize para a direita para salvar e para esquerda para pular.
        </h2>
        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, marginBottom: 36, maxWidth: 360, margin: "0 auto 36px" }}>
          Descubra e avalie filmes em sessões rápidas. Deslize, curta, salve. 
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420, margin: "0 auto" }}>
          {[
            {
              id: "random",
              icon: <Film size={22} style={{ color: "#818CF8" }} />,
              iconBg: "rgba(99,102,241,0.14)",
              accentColor: "#818CF8",
              title: "Explorar",
              subtitle: "Filmes populares, tendências e bem avaliados",
              tag: "Aleatório",
            },
            {
              id: "recommended",
              icon: <Target size={22} style={{ color: C.gold }} />,
              iconBg: `${C.gold}18`,
              accentColor: C.gold,
              title: "Para Você",
              subtitle: hasRatings
                ? "Baseado no seu gosto — sessão infinita de descobertas"
                : "Avalie filmes para personalizar suas recomendações",
              tag: "IA",
            },
          ].map(({ id, icon, iconBg, accentColor, title, subtitle, tag }) => (
            <button
              key={id}
              onClick={() => onStart(id)}
              style={{
                padding: 20, borderRadius: 18,
                background: `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.95))`,
                border: `1px solid ${defaultMode === id ? C.gold : C.border}`,
                boxShadow: defaultMode === id ? `0 0 0 1px ${C.gold}33, 0 8px 24px rgba(201,168,76,0.12)` : "none",
                cursor: "pointer", textAlign: "left", transition: "all 0.25s",
                display: "flex", gap: 18, alignItems: "center",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accentColor + "66";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px ${accentColor}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = defaultMode === id ? C.gold : C.border;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = defaultMode === id ? `0 0 0 1px ${C.gold}33, 0 8px 24px rgba(201,168,76,0.12)` : "none";
              }}
            >
              {defaultMode === id && (
                <span style={{
                  position: "absolute", top: 10, right: 10,
                  fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 999,
                  background: C.gold, color: C.bgDeep, letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>Padrão</span>
              )}
              <div style={{
                width: 52, height: 52, borderRadius: 15, background: iconBg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{title}</h3>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                    background: accentColor + "22", color: accentColor, letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>{tag}</span>
                </div>
                <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.4 }}>{subtitle}</p>
              </div>
              <ChevronRight size={16} style={{ color: C.textDim, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main QuickRatePage ───────────────────────────────────
export function QuickRatePage({ setPage, setSelectedMovie, auth }) {
  const [mode, setMode] = useState(null);
  const [movies, setMovies] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [dragStartX, setDragStartX] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(null);
  const [sessionStats, setSessionStats] = useState({ rated: [], watchlistAdded: [], skipped: 0, startTime: null });
  const { ratings, upsertRating, getRating } = useRatings(auth?.user?.id);
  const { preferences } = useUserPreferences(auth?.user?.id);
  const { add: addWl, remove: removeWl, isInList: inWl } = useWatchlist(auth?.user?.id);
  const recPageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const ratedIdsSet = useMemo(() => new Set(ratings.map((r) => r.tmdb_id)), [ratings]);

  const loadRandom = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const rp = Math.floor(Math.random() * 20) + 1;
      const [pop, top, trend] = await Promise.all([
        tmdb.popular(rp), tmdb.topRated(Math.floor(Math.random() * 10) + 1),
        tmdb.trending(Math.floor(Math.random() * 5) + 1),
      ]);
      const all = [...(pop?.results || []), ...(top?.results || []), ...(trend?.results || [])];
      const filtered = applyPreferenceFilters(all, preferences, ratedIdsSet);
      const unique = []; const seen = new Set();
      for (const m of filtered) { if (!seen.has(m.id)) { seen.add(m.id); unique.push(m); } }
      for (let i = unique.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [unique[i], unique[j]] = [unique[j], unique[i]]; }
      if (append) setMovies((prev) => [...prev, ...unique.filter((u) => !prev.some((p) => p.id === u.id))]);
      else { setMovies(unique); setIdx(0); }
    } catch { toast.error("Erro ao carregar filmes"); }
    setLoading(false);
  }, [preferences, ratedIdsSet]);

  const loadRecommended = useCallback(async (append = false) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoading(true);
    try {
      if (!ratings.length) { await loadRandom(append); loadingMoreRef.current = false; return; }
      const userAvg = ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length;
      let seeds = ratings.filter((r) => Number(r.rating) >= userAvg).sort((a, b) => Number(b.rating) - Number(a.rating));
      if (!seeds.length) seeds = [...ratings].sort((a, b) => Number(b.rating) - Number(a.rating));
      const ratedIds = new Set(ratings.map((r) => r.tmdb_id));
      const page = recPageRef.current;
      const WINDOW = 8; const total = seeds.length; const start = (page * WINDOW) % total;
      const seedMovies = [];
      for (let i = 0; i < Math.min(WINDOW, total); i++) seedMovies.push(seeds[(start + i) % total]);
      const maxR = Math.max(...seedMovies.map((s) => Number(s.rating)), 1);
      const results = await Promise.all(
        seedMovies.map((r) => tmdb.get(`/movie/${r.tmdb_id}/recommendations`, { page: String((page % 3) + 1) })
          .then((res) => ({ res, weight: Number(r.rating) / maxR })).catch(() => null))
      );
      const scoreMap = new Map();
      for (const item of results) {
        if (!item?.res?.results) continue;
        const filtered = applyPreferenceFilters(item.res.results, preferences, ratedIds);
        for (const raw of filtered) {
          const inc = item.weight * (1 + (raw.vote_average || 0) / 10);
          const prev = scoreMap.get(raw.id);
          if (prev) prev.score += inc; else scoreMap.set(raw.id, { movie: raw, score: inc });
        }
      }
      const unique = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score).map((x) => x.movie);
      recPageRef.current = page + 1;
      if (append) setMovies((prev) => { const ids = new Set(prev.map((p) => p.id)); return [...prev, ...unique.filter((u) => !ids.has(u.id))]; });
      else { setMovies(unique); setIdx(0); }
    } catch { toast.error("Erro ao carregar recomendações"); }
    setLoading(false);
    loadingMoreRef.current = false;
  }, [ratings, loadRandom, preferences]);

  const startSession = (m) => {
    setMode(m); recPageRef.current = 0;
    setSessionStats({ rated: [], watchlistAdded: [], skipped: 0, startTime: Date.now() });
    if (m === "random") loadRandom(); else loadRecommended();
  };

  useEffect(() => {
    if (!mode || loading || mode === "summary") return;
    if (idx >= movies.length - 3) {
      if (mode === "random") loadRandom(true); else loadRecommended(true);
    }
  }, [idx, movies.length, mode, loading]);

  const current = movies[idx];
  const existingRating = current ? getRating(current.id) : null;
  const [localRating, setLocalRating] = useState(0);
  useEffect(() => { setLocalRating(existingRating ? Number(existingRating.rating) : 0); }, [idx, existingRating?.rating]);

  const handleRate = async (stars) => {
    if (!current || !auth?.user) return;
    setLocalRating(stars);
    try {
      await upsertRating(current.id, stars, null, current.title, tmdb.poster(current.poster_path));
      setSessionStats((prev) => {
        const exists = prev.rated.find((r) => r.id === current.id);
        if (exists) return { ...prev, rated: prev.rated.map((r) => r.id === current.id ? { ...r, stars } : r) };
        return { ...prev, rated: [...prev.rated, { id: current.id, title: current.title, poster: tmdb.poster(current.poster_path), stars }] };
      });
    } catch { toast.error("Erro ao avaliar"); }
  };

  const goNext = () => {
    if (idx < movies.length - 1) {
      setDirection("left"); setAnimating(true);
      setTimeout(() => { setIdx((i) => i + 1); setAnimating(false); setDirection(null); setSwipeX(0); }, 280);
    }
  };
  const goPrev = () => {
    if (idx > 0) {
      setDirection("right"); setAnimating(true);
      setTimeout(() => { setIdx((i) => i - 1); setAnimating(false); setDirection(null); setSwipeX(0); }, 280);
    }
  };

  useEffect(() => {
    if (!mode || mode === "summary") return;
    const fn = (e) => { if (e.key === "ArrowRight") goNext(); if (e.key === "ArrowLeft") goPrev(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [idx, movies.length, mode]);

  if (!mode) return (
    <ModeSelect
      onStart={startSession}
      hasRatings={ratings.length > 0}
      defaultMode={preferences.quick_rate_default_mode}
    />
  );

  if (mode === "summary") return (
    <SessionSummary
      stats={sessionStats}
      idx={idx}
      onNewSession={() => setMode(null)}
      onHome={() => setPage("home")}
      onMovieClick={(r) => { setSelectedMovie({ tmdbId: r.id, title: r.title, poster: r.poster }); setPage("movie"); }}
    />
  );

  if (loading && movies.length === 0) return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}15, transparent 65%)`, filter: "blur(70px)" }} />
      <Spinner size={36} />
      <p style={{ color: C.textMuted, fontSize: 14, position: "relative" }}>
        {mode === "recommended" ? "Personalizando sua sessão..." : "Carregando filmes..."}
      </p>
    </div>
  );

  if (!current) return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <Film size={48} style={{ color: C.textDim }} />
      <p style={{ color: C.textMuted }}>Nenhum filme encontrado</p>
      <Btn variant="gold" onClick={() => setMode(null)}>Voltar</Btn>
    </div>
  );

  const posterUrl = tmdb.poster(current.poster_path, "w500");
  const backdropUrl = tmdb.backdrop(current.backdrop_path);
  const year = current.release_date?.slice(0, 4);
  const cardStyle = {
    transform: animating
      ? (direction === "left" ? "translateX(-130%) rotate(-10deg)" : "translateX(130%) rotate(10deg)")
      : `translateX(${swipeX}px) rotate(${swipeX * 0.035}deg)`,
    transition: animating ? "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s"
      : dragStartX ? "none" : "transform 0.2s ease-out",
    opacity: animating ? 0 : 1,
  };

  const swipeIndicatorOpacity = Math.min(Math.abs(swipeX) / 80, 1);
  const isLiking = swipeX > 30;
  const isSkipping = swipeX < -30;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {/* Ambient background */}
      {backdropUrl && (
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <img src={backdropUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.08, filter: "blur(40px)", transform: "scale(1.1)" }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${C.bg}cc, ${C.bg}ee, ${C.bg})` }} />
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto", width: "100%", padding: "0 16px 16px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingBottom: 16 }}>
          <button onClick={() => setMode(null)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            borderRadius: 12, background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13,
            fontWeight: 600, cursor: "pointer", minHeight: "unset",
          }}>
            <ChevronLeft size={16} /> Sair
          </button>

          {/* Mode badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }}>
            {mode === "recommended" ? <Target size={13} style={{ color: C.gold }} /> : <Film size={13} style={{ color: "#818CF8" }} />}
            <span style={{ fontSize: 12, fontWeight: 700, color: mode === "recommended" ? C.gold : "#818CF8" }}>
              {mode === "recommended" ? "Para Você" : "Explorar"}
            </span>
          </div>

          <span style={{ fontSize: 12, color: C.textDim, fontWeight: 500 }}>
            {idx + 1}<span style={{ opacity: 0.5 }}> / {movies.length}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: C.border, borderRadius: 1, marginBottom: 16, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 1,
            background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})`,
            width: `${Math.min(((idx + 1) / Math.max(movies.length, 1)) * 100, 100)}%`,
            transition: "width 0.3s ease",
          }} />
        </div>

        {/* Card area */}
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Swipe hint overlays */}
          {isLiking && (
            <div style={{
              position: "absolute", top: "20%", left: 20, zIndex: 20,
              opacity: swipeIndicatorOpacity, transform: `scale(${0.8 + swipeIndicatorOpacity * 0.3})`,
              transition: "all 0.1s",
            }}>
              <div style={{
                padding: "8px 18px", borderRadius: 12,
                border: "2.5px solid #22C55E", color: "#22C55E",
                fontSize: 16, fontWeight: 800, fontFamily: "'Outfit', sans-serif",
                transform: "rotate(-15deg)", letterSpacing: "0.06em",
              }}>SALVAR</div>
            </div>
          )}
          {isSkipping && (
            <div style={{
              position: "absolute", top: "20%", right: 20, zIndex: 20,
              opacity: swipeIndicatorOpacity, transform: `scale(${0.8 + swipeIndicatorOpacity * 0.3})`,
              transition: "all 0.1s",
            }}>
              <div style={{
                padding: "8px 18px", borderRadius: 12,
                border: "2.5px solid #EF4444", color: "#EF4444",
                fontSize: 16, fontWeight: 800, fontFamily: "'Outfit', sans-serif",
                transform: "rotate(15deg)", letterSpacing: "0.06em",
              }}>SKIP</div>
            </div>
          )}

          {/* Movie card */}
          <div
            style={{ width: "100%", userSelect: "none", touchAction: "pan-y" }}
            onPointerDown={(e) => setDragStartX(e.clientX)}
            onPointerMove={(e) => { if (dragStartX !== null) setSwipeX(e.clientX - dragStartX); }}
            onPointerUp={() => {
              if (dragStartX !== null) {
                if (swipeX < -80) { setSessionStats(p => ({ ...p, skipped: p.skipped + 1 })); goNext(); }
                else if (swipeX > 80) {
                  if (!inWl(current.id)) {
                    addWl(current.id, current.title, tmdb.poster(current.poster_path));
                    setSessionStats(p => ({ ...p, watchlistAdded: [...p.watchlistAdded, current.id] }));
                    toast.success("Adicionado à watchlist!");
                  }
                  goNext();
                } else setSwipeX(0);
                setDragStartX(null);
              }
            }}
            onPointerLeave={() => { if (dragStartX !== null) { setSwipeX(0); setDragStartX(null); } }}
          >
            <div style={{ ...cardStyle, cursor: dragStartX ? "grabbing" : "grab" }}>
              <div
                style={{
                  width: "100%", aspectRatio: "2/3", maxHeight: "58dvh",
                  borderRadius: 20, overflow: "hidden", position: "relative",
                  boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)`,
                  background: C.bgCard,
                }}
                onClick={(e) => {
                  if (Math.abs(swipeX) < 8) {
                    setSelectedMovie({ tmdbId: current.id, title: current.title, poster: posterUrl });
                    setPage("movie");
                  }
                }}
              >
                <img src={posterUrl} alt={current.title} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />

                {/* Gradient overlay */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: "linear-gradient(transparent, rgba(0,0,0,0.92))", pointerEvents: "none" }} />

                {/* Movie info on card */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 20px 18px", pointerEvents: "none" }}>
                  <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif", lineHeight: 1.2, marginBottom: 6, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                    {current.title}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {year && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{year}</span>}
                    {current.vote_average > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.gold, fontSize: 13, fontWeight: 600 }}>
                        <Star size={12} fill={C.gold} /> {current.vote_average.toFixed(1)}
                      </span>
                    )}
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Toque para detalhes</span>
                  </div>
                </div>

                {/* Watchlist badge */}
                {inWl(current.id) && (
                  <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 8, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Bookmark size={11} fill="#22C55E" stroke="#22C55E" />
                    <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 700 }}>Na Lista</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rating & actions */}
        <div style={{ paddingTop: 16 }}>
          {/* Stars */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ textAlign: "center", fontSize: 11, color: C.textDim, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              {localRating ? `${localRating.toFixed(1)} / 5.0` : "Toque para avaliar"}
            </p>
            <CinematicStars value={localRating} onChange={handleRate} size={34} />
          </div>

          {/* Action buttons row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
            {/* Prev */}
            <button
              onClick={goPrev}
              disabled={idx === 0}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: idx > 0 ? "rgba(255,255,255,0.07)" : "transparent",
                border: `1px solid ${idx > 0 ? C.border : "transparent"}`,
                color: idx > 0 ? C.textMuted : C.textDim,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: idx > 0 ? "pointer" : "not-allowed",
                minHeight: "unset", minWidth: "unset", transition: "all 0.18s",
              }}
            >
              <ChevronLeft size={20} />
            </button>

            {/* Watchlist */}
            <button
              onClick={async () => {
                if (inWl(current.id)) {
                  await removeWl(current.id);
                  setSessionStats(p => ({ ...p, watchlistAdded: p.watchlistAdded.filter(id => id !== current.id) }));
                  toast.success("Removido da watchlist");
                } else {
                  await addWl(current.id, current.title, tmdb.poster(current.poster_path));
                  setSessionStats(p => ({ ...p, watchlistAdded: [...p.watchlistAdded, current.id] }));
                  toast.success("Adicionado à watchlist!");
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                borderRadius: 14,
                background: inWl(current.id) ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${inWl(current.id) ? "rgba(34,197,94,0.4)" : C.border}`,
                color: inWl(current.id) ? "#22C55E" : C.textMuted,
                fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: "unset", transition: "all 0.18s",
              }}
            >
              <Bookmark size={15} fill={inWl(current.id) ? "#22C55E" : "none"} />
              {inWl(current.id) ? "Salvo" : "Salvar"}
            </button>

            {/* Skip */}
            <button
              onClick={() => { setSessionStats(p => ({ ...p, skipped: p.skipped + 1 })); goNext(); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                borderRadius: 14, background: "rgba(255,255,255,0.06)",
                border: `1px solid ${C.border}`,
                color: C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
                minHeight: "unset", transition: "all 0.18s",
              }}
            >
              <SkipForward size={15} /> Pular
            </button>

            {/* Next */}
            <button
              onClick={goNext}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`,
                color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", minHeight: "unset", minWidth: "unset", transition: "all 0.18s",
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Session mini stats + end */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 14, padding: "12px 16px", borderRadius: 14,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Star size={12} style={{ color: C.gold }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{sessionStats.rated.length}</span>
                <span style={{ fontSize: 11, color: C.textDim }}>aval.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Bookmark size={12} style={{ color: "#22C55E" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{sessionStats.watchlistAdded.length}</span>
                <span style={{ fontSize: 11, color: C.textDim }}>lista</span>
              </div>
            </div>
            <button
              onClick={() => setMode("summary")}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 14px",
                borderRadius: 10, background: `linear-gradient(135deg, ${C.goldDim}44, ${C.gold}33)`,
                border: `1px solid ${C.gold}44`, color: C.gold,
                fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: "unset",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <Award size={13} /> Finalizar
            </button>
          </div>

          <p style={{ textAlign: "center", color: C.textDim, fontSize: 10, marginTop: 10 }}>
            Arraste ← para pular · → para salvar · use as setas do teclado
          </p>
        </div>
      </div>
    </div>
  );
}
