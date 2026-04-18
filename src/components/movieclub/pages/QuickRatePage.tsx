// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { C, tmdb } from "../foundation";
import {
  Film, Star, Target, Award, Zap, Bookmark, Eye,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Spinner, Btn } from "../ui";
import { useRatings, useWatchlist } from "../hooks";

export function QuickRatePage({ setPage, setSelectedMovie, auth }) {
  const [mode, setMode] = useState(null);
  const [movies, setMovies] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [dragStartX, setDragStartX] = useState(null);
  const [swipeX, setSwipeX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(null);
  const { ratings, upsertRating, getRating } = useRatings(auth?.user?.id);
  const { items: wl, add: addWl, remove: removeWl, isInList: inWl } = useWatchlist(auth?.user?.id);
  const containerRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const recPageRef = useRef(0);
  const [sessionStats, setSessionStats] = useState({ rated: [], watchlistAdded: [], skipped: 0, startTime: null });

  const loadRandom = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const rp = Math.floor(Math.random() * 20) + 1;
      const [pop, top, trend] = await Promise.all([tmdb.popular(rp), tmdb.topRated(Math.floor(Math.random() * 10) + 1), tmdb.trending(Math.floor(Math.random() * 5) + 1)]);
      const all = [...(pop?.results || []), ...(top?.results || []), ...(trend?.results || [])];
      const unique = []; const seen = new Set();
      for (const m of all) { if (!seen.has(m.id) && m.poster_path) { seen.add(m.id); unique.push(m); } }
      for (let i = unique.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [unique[i], unique[j]] = [unique[j], unique[i]]; }
      if (append) setMovies((prev) => [...prev, ...unique.filter((u) => !prev.some((p) => p.id === u.id))]);
      else { setMovies(unique); setIdx(0); }
    } catch { toast.error("Erro ao carregar filmes"); }
    setLoading(false);
  }, []);

  const loadRecommended = useCallback(async (append = false) => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoading(true);
    try {
      if (!ratings.length) { await loadRandom(append); loadingMoreRef.current = false; return; }
      const userAverage = ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length;
      let seeds = ratings.filter((r) => Number(r.rating) >= userAverage).sort((a, b) => Number(b.rating) - Number(a.rating));
      if (!seeds.length) seeds = [...ratings].sort((a, b) => Number(b.rating) - Number(a.rating));
      const ratedIds = new Set(ratings.map((r) => r.tmdb_id));
      const page = recPageRef.current;
      const WINDOW = 8; const total = seeds.length; const start = (page * WINDOW) % total;
      const seedMovies = [];
      for (let i = 0; i < Math.min(WINDOW, total); i++) seedMovies.push(seeds[(start + i) % total]);
      const maxRating = Math.max(...seedMovies.map((s) => Number(s.rating)), 1);
      const results = await Promise.all(seedMovies.map((r) => tmdb.get(`/movie/${r.tmdb_id}/recommendations`, { page: String((page % 3) + 1) }).then((res) => ({ res, weight: Number(r.rating) / maxRating })).catch(() => null)));
      const scoreMap = new Map();
      for (const item of results) {
        if (!item?.res?.results) continue;
        for (const raw of item.res.results) {
          if (!raw.poster_path || ratedIds.has(raw.id)) continue;
          const inc = item.weight * (1 + (raw.vote_average || 0) / 10);
          const prev = scoreMap.get(raw.id);
          if (prev) prev.score += inc; else scoreMap.set(raw.id, { movie: raw, score: inc });
        }
      }
      const unique = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score).map((x) => x.movie);
      recPageRef.current = page + 1;
      if (append) setMovies((prev) => { const existIds = new Set(prev.map((p) => p.id)); return [...prev, ...unique.filter((u) => !existIds.has(u.id))]; });
      else { setMovies(unique); setIdx(0); }
    } catch { toast.error("Erro ao carregar recomendações"); }
    setLoading(false);
    loadingMoreRef.current = false;
  }, [ratings, loadRandom]);

  const startSession = (m) => {
    setMode(m); recPageRef.current = 0;
    setSessionStats({ rated: [], watchlistAdded: [], skipped: 0, startTime: Date.now() });
    if (m === "random") loadRandom(); else loadRecommended();
  };

  useEffect(() => {
    if (!mode || loading) return;
    if (idx >= movies.length - 3) { if (mode === "random") loadRandom(true); else loadRecommended(true); }
  }, [idx, movies.length, mode, loading]);

  const current = movies[idx];
  const existingRating = current ? getRating(current.id) : null;
  const [localRating, setLocalRating] = useState(0);
  useEffect(() => { if (existingRating) setLocalRating(existingRating.rating); else setLocalRating(0); }, [idx, existingRating?.rating]);

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
      toast.success(`${stars} estrela${stars !== 1 ? "s" : ""} para ${current.title}`);
    } catch { toast.error("Erro ao avaliar"); }
  };

  const goNext = () => {
    if (idx < movies.length - 1) {
      setDirection("left"); setAnimating(true);
      setTimeout(() => { setIdx((i) => i + 1); setAnimating(false); setDirection(null); setSwipeX(0); }, 250);
    }
  };
  const goPrev = () => {
    if (idx > 0) {
      setDirection("right"); setAnimating(true);
      setTimeout(() => { setIdx((i) => i - 1); setAnimating(false); setDirection(null); setSwipeX(0); }, 250);
    }
  };
  const handleOpenMovie = () => { if (!current) return; setSelectedMovie({ tmdbId: current.id, title: current.title, poster: tmdb.poster(current.poster_path) }); setPage("movie"); };
  const onPointerDown = (e) => setDragStartX(e.clientX);
  const onPointerMove = (e) => { if (dragStartX !== null) setSwipeX(e.clientX - dragStartX); };
  const onPointerUp = () => { if (dragStartX !== null) { if (swipeX < -80) goNext(); else if (swipeX > 80) goPrev(); else setSwipeX(0); setDragStartX(null); } };
  useEffect(() => {
    if (!mode) return;
    const fn = (e) => { if (e.key === "ArrowRight") goNext(); if (e.key === "ArrowLeft") goPrev(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [idx, movies.length, mode]);

  // Setup screen
  if (!mode) {
    const hasRatings = ratings.length > 0;
    return (
      <div style={{ paddingTop: 80, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, width: "100%", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`, border: `1px solid ${C.gold}33`, marginBottom: 16 }}>
              <Zap size={28} style={{ color: C.gold }} />
            </div>
            <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, margin: "0 0 8px", fontFamily: "'Outfit', sans-serif" }}>Avaliação Rápida</h1>
            <p style={{ color: C.textMuted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>Escolha como quer descobrir filmes nesta sessão</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { id: "random", icon: <Film size={24} style={{ color: "#818CF8" }} />, iconBg: "rgba(99,102,241,0.12)", title: "Aleatório", desc: "Filmes populares, em alta e bem avaliados misturados aleatoriamente" },
              { id: "recommended", icon: <Target size={24} style={{ color: C.gold }} />, iconBg: `${C.gold}18`, title: "Recomendados", desc: hasRatings ? "Baseado nos filmes que você já avaliou — sessão infinita de descobertas" : "Avalie alguns filmes primeiro para desbloquear recomendações personalizadas (usaremos populares enquanto isso)" },
            ].map(({ id, icon, iconBg, title, desc }) => (
              <button key={id} onClick={() => startSession(id)} style={{ padding: 24, borderRadius: 16, background: C.bgCard, border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left", transition: "all 0.2s", display: "flex", gap: 20, alignItems: "center" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.background = C.bgCardHover; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                <div>
                  <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px", fontFamily: "'DM Sans', sans-serif" }}>{title}</h3>
                  <p style={{ color: C.textMuted, fontSize: 13, margin: 0, lineHeight: 1.4 }}>{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Summary screen
  if (mode === "summary") {
    const elapsed = sessionStats.startTime ? Math.round((Date.now() - sessionStats.startTime) / 60000) : 0;
    const avgRating = sessionStats.rated.length > 0 ? (sessionStats.rated.reduce((sum, r) => sum + r.stars, 0) / sessionStats.rated.length).toFixed(1) : "0";
    const totalViewed = idx + 1;
    const distribution = [1, 2, 3, 4, 5].map((s) => sessionStats.rated.filter((r) => Math.ceil(r.stars) === s).length);
    const maxDist = Math.max(...distribution, 1);
    return (
      <div style={{ paddingTop: 80, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 500, width: "100%", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`, border: `1px solid ${C.gold}33`, marginBottom: 16 }}><Award size={28} style={{ color: C.gold }} /></div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: "0 0 6px", fontFamily: "'Outfit', sans-serif" }}>Sessão Finalizada</h1>
            <p style={{ color: C.textMuted, fontSize: 13 }}>{elapsed > 0 ? `${elapsed} minuto${elapsed !== 1 ? "s" : ""} de sessão` : "Menos de um minuto"}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
            {[[sessionStats.rated.length, "Avaliados", Star, C.gold], [sessionStats.watchlistAdded.length, "Na Watchlist", Bookmark, "#22C55E"], [totalViewed, "Visualizados", Eye, "#818CF8"]].map(([val, label, Icon, color], i) => (
              <div key={i} style={{ padding: 16, borderRadius: 14, background: C.bgCard, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <Icon size={18} style={{ color, marginBottom: 6 }} />
                <div style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{val}</div>
                <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {sessionStats.rated.length > 0 && (
            <div style={{ padding: 20, borderRadius: 16, background: C.bgCard, border: `1px solid ${C.border}`, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>Nota Média</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Star size={16} fill={C.gold} stroke={C.gold} /><span style={{ color: C.gold, fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{avgRating}</span></div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 60 }}>
                {distribution.map((count, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", borderRadius: 4, height: Math.max((count / maxDist) * 48, 4), background: count > 0 ? `linear-gradient(to top, ${C.gold}, ${C.goldLight})` : C.border, transition: "height 0.3s" }} />
                    <span style={{ fontSize: 10, color: C.textMuted }}>{i + 1}<Star size={8} style={{ marginLeft: 1 }} /></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sessionStats.rated.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Filmes Avaliados</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                {sessionStats.rated.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => { setSelectedMovie({ tmdbId: r.id, title: r.title, poster: r.poster }); setPage("movie"); }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderHover)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                    {r.poster && <img src={r.poster} alt="" style={{ width: 32, height: 48, borderRadius: 6, objectFit: "cover" }} />}
                    <span style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: 500 }}>{r.title}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}><Star size={12} fill={C.gold} stroke={C.gold} /><span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{r.stars}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn variant="outline" onClick={() => setMode(null)}>Nova Sessão</Btn>
            <Btn variant="gold" onClick={() => setPage("home")}>Voltar ao Início</Btn>
          </div>
        </div>
      </div>
    );
  }

  if (loading && movies.length === 0) return (
    <div style={{ paddingTop: 100, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <Spinner size={36} />
      <p style={{ color: C.textMuted, fontSize: 14 }}>Preparando sessão{mode === "recommended" ? " personalizada" : ""}...</p>
    </div>
  );

  if (!current) return (
    <div style={{ paddingTop: 100, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <Film size={48} style={{ color: C.textDim }} />
      <p style={{ color: C.textMuted, fontSize: 14 }}>Nenhum filme encontrado</p>
      <Btn variant="gold" onClick={() => setMode(null)}>Voltar</Btn>
    </div>
  );

  const posterUrl = tmdb.poster(current.poster_path, "w500");
  const backdropUrl = tmdb.backdrop(current.backdrop_path);
  const year = current.release_date?.slice(0, 4);
  const cardTransform = animating ? (direction === "left" ? "translateX(-120%) rotate(-8deg)" : "translateX(120%) rotate(8deg)") : `translateX(${swipeX}px) rotate(${swipeX * 0.04}deg)`;

  return (
    <div style={{ paddingTop: 80, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {backdropUrl && (
        <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
          <img src={backdropUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.15, filter: "blur(30px)" }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${C.bg}dd, ${C.bg})` }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "20px 20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setMode(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, display: "flex", alignItems: "center", padding: 4, borderRadius: 8, transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = C.text)} onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}>
              <ChevronLeft size={20} />
            </button>
            {mode === "recommended" ? <Target size={18} style={{ color: C.gold }} /> : <Film size={18} style={{ color: "#818CF8" }} />}
            <span style={{ color: C.text, fontWeight: 700, fontSize: 16, fontFamily: "'DM Sans', sans-serif" }}>{mode === "recommended" ? "Recomendados" : "Aleatório"}</span>
          </div>
          <span style={{ color: C.textDim, fontSize: 12 }}>{idx + 1} / {movies.length}{mode === "recommended" ? "+" : ""}</span>
        </div>

        <div ref={containerRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} style={{ touchAction: "pan-y", userSelect: "none" }}>
          <div style={{ transform: cardTransform, transition: animating ? "transform 0.25s ease-out, opacity 0.25s" : dragStartX ? "none" : "transform 0.2s ease-out", opacity: animating ? 0 : 1 }}>
            <div onClick={handleOpenMovie} style={{ cursor: "pointer", borderRadius: 20, overflow: "hidden", position: "relative", aspectRatio: "2/3", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: `1px solid ${C.border}` }}>
              <img src={posterUrl} alt={current.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px" }}>
                <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2, fontFamily: "'DM Sans', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{current.title}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                  {year && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500 }}>{year}</span>}
                  {current.vote_average > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.gold, fontSize: 13, fontWeight: 600 }}><Star size={13} fill={C.gold} /> {current.vote_average.toFixed(1)}</span>}
                </div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 8 }}>Toque para ver detalhes</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={goPrev} disabled={idx === 0} style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: idx > 0 ? "rgba(255,255,255,0.08)" : "transparent", border: `1px solid ${idx > 0 ? C.border : "transparent"}`, color: idx > 0 ? C.text : C.textDim, cursor: idx > 0 ? "pointer" : "default", transition: "all 0.2s" }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const filled = s <= (hoverStar || localRating);
              return (
                <button key={s} onClick={() => handleRate(s === localRating ? s - 0.5 : s)} onMouseEnter={() => setHoverStar(s)} onMouseLeave={() => setHoverStar(0)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, transform: filled ? "scale(1.15)" : "scale(1)", transition: "all 0.15s" }}>
                  <Star size={28} fill={filled ? C.gold : "transparent"} stroke={filled ? C.gold : C.textDim} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
          <button onClick={goNext} style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", border: `1px solid ${C.border}`, color: C.text, cursor: "pointer", transition: "all 0.2s" }}>
            <ChevronRight size={22} />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
          <Btn variant={inWl(current.id) ? "gold" : "outline"} size="sm" onClick={async () => {
            if (inWl(current.id)) { await removeWl(current.id); setSessionStats((prev) => ({ ...prev, watchlistAdded: prev.watchlistAdded.filter((id) => id !== current.id) })); toast.success("Removido da watchlist"); }
            else { await addWl(current.id, current.title, tmdb.poster(current.poster_path)); setSessionStats((prev) => ({ ...prev, watchlistAdded: [...prev.watchlistAdded, current.id] })); toast.success("Adicionado à watchlist"); }
          }}>
            <Bookmark size={14} fill={inWl(current.id) ? C.gold : "none"} />
            {inWl(current.id) ? "Na Watchlist" : "Watchlist"}
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => { setSessionStats((prev) => ({ ...prev, skipped: prev.skipped + 1 })); goNext(); }}>
            Pular <ChevronRight size={14} />
          </Btn>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 20, padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={13} style={{ color: C.gold }} />
            <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{sessionStats.rated.length}</span>
            <span style={{ color: C.textDim, fontSize: 11 }}>avaliados</span>
          </div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Bookmark size={13} style={{ color: C.gold }} />
            <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{sessionStats.watchlistAdded.length}</span>
            <span style={{ color: C.textDim, fontSize: 11 }}>na lista</span>
          </div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <Btn variant="outline" size="sm" onClick={() => setMode("summary")} style={{ fontSize: 11, padding: "4px 12px" }}>
            <Award size={13} /> Finalizar
          </Btn>
        </div>

        <p style={{ textAlign: "center", color: C.textDim, fontSize: 11, marginTop: 12 }}>
          Arraste para os lados ou use as setas ← → para navegar
        </p>
      </div>
    </div>
  );
}
