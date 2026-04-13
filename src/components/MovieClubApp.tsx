// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { tmdbProxy, omdbProxy, streamingProxy } from "@/lib/movie-api.functions";
import logoMain from "@/assets/logo-main.png";
import mascotsNav from "@/assets/mascots-nav.png";
import logoText from "@/assets/logo-text.png";

// ─────────────────────────────────────────────
//  DESIGN TOKENS
// ─────────────────────────────────────────────
const C = {
  bg: "#0F1923", bgCard: "#162130", bgCardHover: "#1B2838", bgDeep: "#091523",
  gold: "#C9A84C", goldLight: "#E2C97E", goldDim: "#8A6E30",
  text: "#F0EDE6", textMuted: "#8A9BB0", textDim: "#4A5E72",
  border: "#1E3347", borderHover: "#2A4660",
  accent: "#2563EB", accentSoft: "#1E3A5F",
  success: "#22C55E", red: "#EF4444", orange: "#F97316",
  netflix: "#E50914", prime: "#00A8E1", disney: "#113CCF",
  hbo: "#5822B4", apple: "#888888", paramount: "#0064FF", hulu: "#1CE783",
};

// ─────────────────────────────────────────────
//  API LAYER (via server functions)
// ─────────────────────────────────────────────
const apiCache = new Map();
async function cachedFetch(key, fetcher, ttlMs = 5 * 60 * 1000) {
  const hit = apiCache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const data = await fetcher();
  apiCache.set(key, { data, ts: Date.now() });
  return data;
}

const TMDB_IMG = "https://image.tmdb.org/t/p";

const tmdb = {
  async get(path, params = {}) {
    const cacheKey = `tmdb:${path}:${JSON.stringify(params)}`;
    return cachedFetch(cacheKey, () => tmdbProxy({ data: { path, params } }));
  },
  async getPage(path, appPage = 1, extraParams = {}) {
    const apiPage1 = (appPage - 1) * 2 + 1;
    const apiPage2 = apiPage1 + 1;
    const [r1, r2] = await Promise.all([
      this.get(path, { ...extraParams, page: String(apiPage1) }),
      this.get(path, { ...extraParams, page: String(apiPage2) }).catch(() => null),
    ]);
    const totalApiPages = Math.min(r1?.total_pages || 1, 500);
    const totalAppPages = Math.ceil(totalApiPages / 2);
    const results = [...(r1?.results || []), ...(r2?.results || [])];
    return { results, appPage, totalAppPages, totalResults: r1?.total_results || 0 };
  },
  poster(path, size = "w300") { return path ? `${TMDB_IMG}/${size}${path}` : null; },
  backdrop(path, size = "w1280") { return path ? `${TMDB_IMG}/${size}${path}` : null; },
  async trending(page = 1) { return this.getPage("/trending/movie/week", page); },
  async popular(page = 1) { return this.getPage("/movie/popular", page); },
  async topRated(page = 1) { return this.getPage("/movie/top_rated", page); },
  async details(id) { return this.get(`/movie/${id}`, { append_to_response: "credits,videos,similar,recommendations" }); },
  async search(q, page = 1) { return this.get("/search/movie", { query: q, page: String(page) }); },
  async genres() { return this.get("/genre/movie/list"); },
  async byGenre(gid, page = 1) { return this.getPage("/discover/movie", page, { with_genres: String(gid), sort_by: "popularity.desc" }); },
  async upcoming(page = 1) { return this.getPage("/movie/upcoming", page); },
};

const omdb = {
  async get(params) {
    const cacheKey = `omdb:${JSON.stringify(params)}`;
    return cachedFetch(cacheKey, () => omdbProxy({ data: { params } }));
  },
  async byImdbId(id) { return this.get({ i: id, plot: "full" }); },
  async byTitle(title, year) { return this.get({ t: title, plot: "short", ...(year ? { y: String(year) } : {}) }); },
};

const streaming = {
  async byTmdb(tmdbId, country = "br") {
    const cacheKey = `stream:${tmdbId}:${country}`;
    return cachedFetch(cacheKey, () => streamingProxy({ data: { tmdbId: Number(tmdbId), country } }));
  },
};

// ─────────────────────────────────────────────
//  DATA NORMALIZER
// ─────────────────────────────────────────────
function normalizeTmdb(raw) {
  if (!raw || raw.success === false) return null;
  return {
    id: raw.id, tmdbId: raw.id, imdbId: raw.imdb_id || null,
    title: raw.title || raw.original_title || "—",
    originalTitle: raw.original_title,
    year: raw.release_date ? +raw.release_date.slice(0, 4) : null,
    releaseDate: raw.release_date,
    overview: raw.overview,
    genre: raw.genres?.[0]?.name || "Outros",
    genres: raw.genres?.map(g => g.name) || [],
    rating: raw.vote_average ? +raw.vote_average.toFixed(1) : null,
    voteCount: raw.vote_count,
    popularity: raw.popularity,
    poster: tmdb.poster(raw.poster_path),
    posterHD: tmdb.poster(raw.poster_path, "w500"),
    backdrop: tmdb.backdrop(raw.backdrop_path),
    runtime: raw.runtime,
    tagline: raw.tagline,
    status: raw.status,
    budget: raw.budget,
    revenue: raw.revenue,
    cast: raw.credits?.cast?.slice(0, 10).map(c => ({
      id: c.id, name: c.name, character: c.character,
      photo: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
    })) || [],
    director: raw.credits?.crew?.find(c => c.job === "Director")?.name || null,
    writers: raw.credits?.crew?.filter(c => c.department === "Writing").slice(0, 2).map(c => c.name).join(", ") || null,
    trailer: raw.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube")?.key || null,
    similar: (raw.similar?.results || []).slice(0, 8).map(normalizeTmdb).filter(Boolean),
    recommendations: (raw.recommendations?.results || []).slice(0, 8).map(normalizeTmdb).filter(Boolean),
  };
}

function mergeOmdb(movie, d) {
  if (!d) return movie;
  return {
    ...movie,
    imdbId: d.imdbID || movie.imdbId,
    imdbRating: d.imdbRating !== "N/A" ? parseFloat(d.imdbRating) : null,
    imdbVotes: d.imdbVotes !== "N/A" ? d.imdbVotes : null,
    rottenTomatoes: d.Ratings?.find(r => r.Source === "Rotten Tomatoes")?.Value || null,
    metacritic: d.Metascore !== "N/A" ? d.Metascore : null,
    rated: d.Rated !== "N/A" ? d.Rated : null,
    awards: d.Awards !== "N/A" ? d.Awards : null,
    boxOffice: d.BoxOffice !== "N/A" ? d.BoxOffice : null,
    language: d.Language !== "N/A" ? d.Language : null,
    country: d.Country !== "N/A" ? d.Country : null,
    plot: d.Plot !== "N/A" ? d.Plot : movie.overview,
    writer: d.Writer !== "N/A" ? d.Writer : null,
  };
}

const STREAM_META = {
  netflix: { name: "Netflix", color: "#E50914", icon: "N" },
  prime: { name: "Prime Video", color: "#00A8E1", icon: "P" },
  disney: { name: "Disney+", color: "#113CCF", icon: "D+" },
  hbo: { name: "Max", color: "#5822B4", icon: "M" },
  apple: { name: "Apple TV+", color: "#888888", icon: "A" },
  paramount: { name: "Paramount+", color: "#0064FF", icon: "P+" },
  hulu: { name: "Hulu", color: "#1CE783", icon: "H" },
  mubi: { name: "MUBI", color: "#001C42", icon: "M" },
  globoplay: { name: "Globoplay", color: "#E10048", icon: "G" },
};

function parseStreamingServices(raw) {
  if (!raw) return [];
  const br = raw.streamingOptions?.br || raw.streamingOptions?.us || raw.streamingInfo?.br || raw.streamingInfo?.us || {};
  const opts = Array.isArray(br)
    ? br.reduce((acc, s) => { if (!acc[s.service]) acc[s.service] = []; acc[s.service].push(s); return acc; }, {})
    : br;
  return Object.entries(opts).flatMap(([svc, entries]) => {
    const meta = STREAM_META[svc] || { name: svc, color: C.textDim, icon: svc[0]?.toUpperCase() || "?" };
    const list = Array.isArray(entries) ? entries : [entries];
    return list.slice(0, 1).map(entry => ({
      service: svc, name: meta.name, color: meta.color, icon: meta.icon,
      type: entry?.type || "subscription",
      link: entry?.link || entry?.url || null,
      quality: entry?.quality || entry?.videoQuality || null,
      price: entry?.price?.formatted || (entry?.price ? `$${entry.price}` : null),
      leaving: entry?.leaving ? new Date(entry.leaving * 1000).toLocaleDateString("pt-BR") : null,
    }));
  }).filter(s => s.name).sort((a, b) => {
    const order = { subscription: 0, free: 0, rent: 1, buy: 2 };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3);
  });
}

// ─────────────────────────────────────────────
//  HOOKS
// ─────────────────────────────────────────────
function useMovieDetails(tmdbId) {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamServices, setStreamServices] = useState([]);
  useEffect(() => {
    if (!tmdbId) return;
    let alive = true;
    setLoading(true); setMovie(null); setStreamServices([]);
    tmdb.details(tmdbId).then(async raw => {
      if (!alive) return;
      const base = normalizeTmdb(raw);
      setMovie(base); setLoading(false);
      const [omdbRes, streamRes] = await Promise.allSettled([
        base.imdbId ? omdb.byImdbId(base.imdbId) : omdb.byTitle(base.title, base.year),
        streaming.byTmdb(tmdbId),
      ]);
      if (!alive) return;
      setMovie(mergeOmdb(base, omdbRes.value));
      setStreamServices(parseStreamingServices(streamRes.value));
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tmdbId]);
  return { movie, loading, streamServices };
}

function usePaginatedMovies(fetcher) {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = useCallback((p) => {
    setLoading(true);
    fetcher(p).then(d => {
      setMovies((d.results || []).map(normalizeTmdb).filter(Boolean));
      setTotalPages(d.totalAppPages || 1);
      setTotalResults(d.totalResults || 0);
      setPage(d.appPage || p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [fetcher]);
  useEffect(() => { load(1); }, [load]);
  const goTo = useCallback((p) => { if (p >= 1 && p <= totalPages) load(p); }, [load, totalPages]);
  return { movies, page, totalPages, totalResults, loading, goTo };
}

// ─────────────────────────────────────────────
//  SOCIAL MOCK DATA
// ─────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: "Alex Mercer", username: "alexm", initials: "AM", color: "#2563EB", reviews: 12, friends: 8 },
  { id: 2, name: "Sofia Reyes", username: "sofiar", initials: "SR", color: "#9333EA", reviews: 27, friends: 15 },
  { id: 3, name: "Kai Nakamura", username: "kain", initials: "KN", color: "#16A34A", reviews: 9, friends: 6 },
  { id: 4, name: "Luca Mago", username: "lucamago", initials: "LM", color: C.gold, reviews: 19, friends: 11 },
];
const MOCK_REVIEWS = [
  { movieTmdbId: 872585, userId: 4, rating: 5, text: "Uma obra monumental. Nolan superou tudo. A cena da detonação é de tirar o fôlego.", date: "15 Jan 2024" },
  { movieTmdbId: 693134, userId: 4, rating: 4, text: "Villeneuve consolida sua visão épica. A segunda parte entrega tudo que a primeira prometeu.", date: "3 Mar 2024" },
  { movieTmdbId: 792307, userId: 4, rating: 5, text: "Lanthimos em sua melhor forma. Emma Stone está absolutamente fora de si.", date: "8 Fev 2024" },
];
const MOCK_GROUPS = [
  { id: 1, name: "Cinéphiles do Recife", members: [1, 2, 3, 4] },
  { id: 2, name: "Weekend Watchlist", members: [1, 4] },
];
const GROUP_RECS = {
  1: { 1: [872585, 693134, 792307, 940551], 2: [872585, 976573, 1014577, 693134], 3: [507089, 940551, 872585, 792307], 4: [872585, 693134, 792307, 1011985] },
  2: { 1: [872585, 792307], 4: [693134, 940551] },
};

// ─────────────────────────────────────────────
//  PRIMITIVES
// ─────────────────────────────────────────────
const Spinner = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SkeletonCard = ({ w = 160 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
    <div className="skeleton" style={{ width: w, height: Math.round(w * 1.5), borderRadius: 8 }} />
    <div className="skeleton" style={{ width: "80%", height: 12, borderRadius: 4 }} />
  </div>
);

function StarRating({ value, max = 5, size = 14, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: max }, (_, i) => {
        const filled = (hover || value) > i;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24"
            fill={filled ? C.gold : "none"} stroke={filled ? C.gold : C.textDim} strokeWidth="1.5"
            style={{ cursor: interactive ? "pointer" : "default", transition: "transform 0.1s" }}
            onMouseEnter={() => interactive && setHover(i + 1)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(i + 1)}>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        );
      })}
    </div>
  );
}

function Avatar({ user, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: user?.color || C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 600, color: "#fff", flexShrink: 0, border: `2px solid ${C.border}` }}>
      {user?.initials || "?"}
    </div>
  );
}

function Badge({ children, color = C.accentSoft, textColor = C.textMuted, small = false }) {
  return (
    <span style={{ background: color, color: textColor, fontSize: small ? 10 : 11, fontWeight: 500, padding: small ? "2px 7px" : "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "ghost", size = "md", style: sx = {}, disabled = false }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, fontSize: size === "sm" ? 12 : 13, fontWeight: 600, padding: size === "sm" ? "6px 14px" : "10px 22px", transition: "all 0.18s", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" };
  const variants = {
    gold: { background: `linear-gradient(135deg,${C.goldDim},${C.gold})`, color: C.bgDeep },
    ghost: { background: C.bgCard, color: C.textMuted, border: `1px solid ${C.border}` },
    outline: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...sx }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
    >{children}</button>
  );
}

function TextInput({ label, value, onChange, placeholder, type = "text", note, style: sx = {} }) {
  return (
    <div style={sx}>
      {label && <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(9,21,35,0.6)", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", transition: "border-color 0.2s, background 0.2s" }}
        onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.background = "rgba(9,21,35,0.8)"; }}
        onBlur={e => { e.target.style.borderColor = C.border; e.target.style.background = "rgba(9,21,35,0.6)"; }} />
      {note && <p style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{note}</p>}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
          {title}
        </h2>
        {action && <button onClick={action.onClick} style={{ fontSize: 12, color: C.gold, fontWeight: 500, transition: "opacity 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>{action.label} →</button>}
      </div>
      {children}
    </div>
  );
}

function FilmStripBg() {
  const n = Array.from({ length: 80 }, (_, i) => i);
  return (
    <div className="film-strip-bg">
      <div className="film-strip-inner">
        {[...n, ...n].map((_, i) => (
          <div key={i} style={{ width: 30, height: 44, background: C.bgDeep, borderRight: `2px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "5px 4px", flexShrink: 0 }}>
            <div style={{ width: "100%", height: 7, background: C.border, borderRadius: 2 }} />
            <div style={{ width: "100%", height: 7, background: C.border, borderRadius: 2 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  STREAMING BADGES
// ─────────────────────────────────────────────
function StreamingBadges({ services, loading }) {
  if (loading) return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: 110, height: 36, borderRadius: 9 }} />)}
    </div>
  );
  if (!services?.length) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: "rgba(74,94,114,0.12)", border: `1px dashed ${C.border}` }}>
      <span style={{ fontSize: 14 }}>📡</span>
      <p style={{ fontSize: 12, color: C.textDim, fontStyle: "italic" }}>Não encontrado em streaming no Brasil</p>
    </div>
  );
  const typeLabel = { subscription: "Incluso", free: "Grátis", rent: "Aluguel", buy: "Comprar" };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {services.map((s, i) => (
        <a key={i} href={s.link || "#"} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 9, background: `${s.color}18`, border: `1px solid ${s.color}40`, color: s.color, fontSize: 12, fontWeight: 600, textDecoration: "none", transition: "all 0.2s", flexDirection: "column", minWidth: 90 }}
          onMouseEnter={e => { e.currentTarget.style.background = `${s.color}30`; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${s.color}18`; e.currentTarget.style.transform = ""; }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 900, lineHeight: 1 }}>{s.icon}</span>
            <span style={{ fontSize: 12 }}>{s.name}</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 500 }}>{s.price || typeLabel[s.type] || s.type}</span>
            {s.quality && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${s.color}30`, fontWeight: 700 }}>{s.quality}</span>}
          </div>
          {s.leaving && <span style={{ fontSize: 9, color: C.orange, opacity: 0.9 }}>Sai em {s.leaving}</span>}
        </a>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  MULTI-SOURCE RATINGS ROW
// ─────────────────────────────────────────────
function RatingsRow({ movie }) {
  const items = [
    movie.rating && { src: "TMDb", val: `${movie.rating}`, suffix: "/10", pct: (movie.rating / 10) * 100, color: "#01B4E4", sub: movie.voteCount ? `${(movie.voteCount / 1000).toFixed(0)}k votos` : null },
    movie.imdbRating && { src: "IMDb", val: `${movie.imdbRating}`, suffix: "/10", pct: (movie.imdbRating / 10) * 100, color: "#F5C518", sub: movie.imdbVotes },
    movie.rottenTomatoes && { src: "RT", val: movie.rottenTomatoes.replace("%", ""), suffix: "%", pct: parseInt(movie.rottenTomatoes), color: parseInt(movie.rottenTomatoes) >= 60 ? C.orange : C.red, sub: "Rotten Tomatoes" },
    movie.metacritic && { src: "MC", val: movie.metacritic, suffix: "/100", pct: parseInt(movie.metacritic), color: parseInt(movie.metacritic) >= 61 ? C.success : parseInt(movie.metacritic) >= 40 ? C.orange : C.red, sub: "Metacritic" },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map((b, i) => (
        <div key={i} style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 16px", minWidth: 78, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${Math.min(b.pct, 100)}%`, background: b.color, borderRadius: "0 2px 2px 0", opacity: 0.5 }} />
          <p style={{ fontSize: 10, color: C.textDim, marginBottom: 4, fontWeight: 500 }}>{b.src}</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: b.color, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>
            {b.val}<span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>{b.suffix}</span>
          </p>
          {b.sub && <p style={{ fontSize: 9, color: C.textDim, marginTop: 3 }}>{b.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  MOVIE CARD (Netflix-style)
// ─────────────────────────────────────────────
function isUpcoming(movie) {
  if (!movie.releaseDate) return false;
  return new Date(movie.releaseDate) > new Date();
}
function formatReleaseDateBR(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function MovieCard({ movie, size = "md", onClick }) {
  const w = size === "sm" ? 110 : size === "lg" ? 200 : 160;
  const h = Math.round(w * 1.5);
  const upcoming = isUpcoming(movie);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="movie-card-netflix" onClick={onClick} style={{ width: w }}>
      <div style={{ width: w, height: h, borderRadius: 8, background: C.bgCard, border: `1px solid ${upcoming ? C.accent : "transparent"}`, overflow: "hidden", position: "relative" }}>
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: upcoming ? "brightness(0.7)" : "none", opacity: imgLoaded ? 1 : 0, transition: "opacity 0.4s ease" }}
            onError={e => e.target.style.display = "none"} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, padding: 8 }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>🎬</span>
            <p style={{ fontSize: 10, color: C.textDim, textAlign: "center", lineHeight: 1.3 }}>{movie.title}</p>
          </div>
        )}
        {!imgLoaded && movie.poster && (
          <div className="skeleton" style={{ position: "absolute", inset: 0, borderRadius: 8 }} />
        )}
        {upcoming && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(37,99,235,0.88)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "4px 0", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            EM BREVE
          </div>
        )}
        {upcoming && movie.releaseDate && (
          <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, background: "rgba(9,21,35,0.92)", color: C.accent, fontSize: 10, fontWeight: 600, padding: "3px 6px", borderRadius: 4, textAlign: "center" }}>
            📅 {formatReleaseDateBR(movie.releaseDate)}
          </div>
        )}
        {/* Hover overlay */}
        <div className="movie-card-overlay">
          <p style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.2, marginBottom: 4 }}>{movie.title}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!upcoming && movie.rating && <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>★ {movie.rating}</span>}
            {movie.year && <span style={{ fontSize: 10, color: C.textMuted }}>{upcoming ? formatReleaseDateBR(movie.releaseDate) : movie.year}</span>}
          </div>
        </div>
        {!upcoming && movie.rating && (
          <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(9,21,35,0.85)", color: C.gold, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
            ★ {movie.rating}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniPoster({ tmdbId }) {
  const [poster, setPoster] = useState(null);
  useEffect(() => {
    if (!tmdbId) return;
    cachedFetch(`mini_${tmdbId}`, () =>
      tmdbProxy({ data: { path: `/movie/${tmdbId}`, params: {} } })
    ).then(d => { if (d?.poster_path) setPoster(tmdb.poster(d.poster_path, "w92")); }).catch(() => { });
  }, [tmdbId]);
  return poster ? <img src={poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null;
}

// ─────────────────────────────────────────────
//  ICONS
// ─────────────────────────────────────────────
const BackIcon = () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
const PlusIcon = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const CheckIcon = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>;
const ShareIcon = () => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
const SearchSVG = ({ size = 16, color = C.textDim }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const KeyIcon = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>;
const PlayIcon = () => <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21" /></svg>;
const HeartIcon = ({ f }) => <svg width={14} height={14} viewBox="0 0 24 24" fill={f ? C.red : "none"} stroke={f ? C.red : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
const ChevronLeft = () => <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>;
const ChevronRight = () => <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>;

// ─────────────────────────────────────────────
//  NETFLIX CAROUSEL
// ─────────────────────────────────────────────
function Carousel({ children, movies, onMovieClick }) {
  const ref = useRef(null);
  const scroll = (dir) => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({ left: dir * amount, behavior: "smooth" });
  };
  return (
    <div className="carousel-wrapper">
      <button className="carousel-btn carousel-btn-left" onClick={() => scroll(-1)}><ChevronLeft /></button>
      <div ref={ref} className="carousel-row">
        {children || movies?.map(m => <MovieCard key={m.id} movie={m} onClick={() => onMovieClick?.(m)} />)}
      </div>
      <button className="carousel-btn carousel-btn-right" onClick={() => scroll(1)}><ChevronRight /></button>
    </div>
  );
}

// ─────────────────────────────────────────────
//  NAVBAR (transparent + blur)
// ─────────────────────────────────────────────
function Navbar({ page, setPage, hasKeys, apiStatus }) {
  const items = [["home", "Discover"], ["profile", "Perfil"], ["groups", "Clubs"], ["search", "Buscar"]];
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(15,25,35,0.95)" : "rgba(15,25,35,0.4)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", height: 64, transition: "all 0.35s ease",
    }}>
      <button onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* 4-point star */}
        <svg width={24} height={24} viewBox="0 0 24 24" fill={C.gold}>
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
        </svg>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 800, color: C.gold, letterSpacing: "0.1em" }}>MOVIECLUB</span>
      </button>

      <div style={{ display: "flex", gap: 0 }}>
        {items.map(([id, label]) => (
          <button key={id} onClick={() => setPage(id)} style={{
            padding: "8px 20px", fontSize: 13, fontWeight: 500,
            color: page === id ? C.gold : C.textMuted,
            borderBottom: page === id ? `2px solid ${C.gold}` : "2px solid transparent",
            transition: "all 0.2s", background: "transparent",
          }}
            onMouseEnter={e => { if (page !== id) e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { if (page !== id) e.currentTarget.style.color = C.textMuted; }}>
            {label}
          </button>
        ))}
      </div>

      <button onClick={() => setPage("settings")} style={{
        display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 8,
        background: "transparent", border: `1px solid ${C.border}`,
        color: C.textMuted, fontSize: 12, transition: "all 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.text; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
        <KeyIcon />
        <span>APIs</span>
      </button>
    </nav>
  );
}

// ─────────────────────────────────────────────
//  SETTINGS PAGE
// ─────────────────────────────────────────────
function SettingsPage({ apiStatus }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});
  const testApis = async () => {
    setTesting(true); setResults({});
    try {
      const tmdbRes = await tmdb.popular();
      setResults(r => ({ ...r, tmdb: { ok: !!tmdbRes?.results, msg: tmdbRes?.results ? `✓ TMDb respondeu com ${tmdbRes.results.length} filmes` : "✗ Falha na resposta" } }));
    } catch (e) { setResults(r => ({ ...r, tmdb: { ok: false, msg: `✗ Erro: ${e.message}` } })); }
    try {
      const omdbRes = await omdb.byTitle("Inception", 2010);
      setResults(r => ({ ...r, omdb: { ok: !!omdbRes?.Title, msg: omdbRes?.Title ? `✓ OMDb: "${omdbRes.Title}" (${omdbRes.Year})` : "✗ Sem resposta" } }));
    } catch (e) { setResults(r => ({ ...r, omdb: { ok: false, msg: `✗ Erro: ${e.message}` } })); }
    setTesting(false);
  };
  const APIS = [
    { key: "tmdb", label: "TMDb API", color: "#01B4E4", desc: "Pôsteres, metadados, elenco, trailers, busca e recomendações.", secret: "TMDB_API_KEY" },
    { key: "omdb", label: "OMDb API", color: "#F5C518", desc: "Ratings IMDb, Rotten Tomatoes, Metacritic, bilheteria e prêmios.", secret: "OMDB_API_KEY" },
    { key: "streaming", label: "Streaming Availability", color: "#0055DA", desc: "Onde assistir no Brasil — Netflix, Prime, Disney+, Max e mais.", secret: "STREAMING_AVAILABILITY_API_KEY" },
  ];
  return (
    <div style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 28px" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 8 }}>Status das <span style={{ color: C.gold }}>APIs</span></h1>
        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>As chaves de API estão configuradas no <strong style={{ color: C.text }}>servidor</strong>.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {APIS.map(api => {
            const result = results[api.key];
            return (
              <div key={api.key} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: api.color, flexShrink: 0 }} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{api.label}</h3>
                </div>
                <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, lineHeight: 1.6, paddingLeft: 20 }}>{api.desc}</p>
                {result && <p style={{ marginTop: 10, fontSize: 12, fontWeight: 500, color: result.ok ? C.success : C.red, padding: "7px 12px", borderRadius: 8, background: result.ok ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)" }}>{result.msg}</p>}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 28 }}>
          <Btn variant="gold" onClick={testApis}>{testing ? <><Spinner size={14} /> Testando…</> : <><CheckIcon /> Testar APIs</>}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PAGINATION
// ─────────────────────────────────────────────
function PaginationBar({ page, totalPages, totalResults, onPageChange }) {
  if (totalPages <= 1) return null;
  const getVisiblePages = () => {
    const pages = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      let start = Math.max(2, page - 2), end = Math.min(totalPages - 1, page + 2);
      if (page <= 3) { start = 2; end = 5; }
      if (page >= totalPages - 2) { start = totalPages - 4; end = totalPages - 1; }
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };
  const btnStyle = (active) => ({
    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: active ? 700 : 400,
    background: active ? C.gold : C.bgCard, color: active ? C.bgDeep : C.textMuted,
    border: `1px solid ${active ? C.gold : C.border}`, cursor: "pointer", transition: "all 0.2s", minWidth: 36, textAlign: "center",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 24 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} style={{ ...btnStyle(false), opacity: page <= 1 ? 0.3 : 1 }}>← Anterior</button>
        {getVisiblePages().map((p, i) =>
          p === "..." ? <span key={`e${i}`} style={{ color: C.textDim, fontSize: 12 }}>…</span>
            : <button key={p} onClick={() => onPageChange(p)} style={btnStyle(p === page)}>{p}</button>
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} style={{ ...btnStyle(false), opacity: page >= totalPages ? 0.3 : 1 }}>Próxima →</button>
      </div>
      <span style={{ fontSize: 11, color: C.textDim }}>Página {page.toLocaleString("pt-BR")} de {totalPages.toLocaleString("pt-BR")} — {totalResults.toLocaleString("pt-BR")} filmes</span>
    </div>
  );
}

// ─────────────────────────────────────────────
//  HERO BANNER (Netflix-style)
// ─────────────────────────────────────────────
function HeroBanner({ movies, onSelect }) {
  const [idx, setIdx] = useState(0);
  const hero = movies[idx];

  useEffect(() => {
    if (movies.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % Math.min(movies.length, 5)), 8000);
    return () => clearInterval(t);
  }, [movies.length]);

  if (!hero) return null;

  return (
    <div style={{ height: 520, position: "relative", overflow: "hidden", marginBottom: 0 }}>
      {/* Backdrop with Ken Burns */}
      {hero.backdrop && (
        <img key={hero.id} src={hero.backdrop} alt="" className="hero-backdrop"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
      )}
      {/* Gradient overlays */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg} 0%, rgba(15,25,35,0.6) 50%, rgba(15,25,35,0.1) 100%)` }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, transparent 50%)` }} />

      {/* Content */}
      <div style={{ position: "absolute", bottom: 80, left: 48, maxWidth: 560, zIndex: 1, animation: "fadeIn 0.5s ease" }} key={hero.id}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Badge color="rgba(201,168,76,0.15)" textColor={C.gold}>✦ Em Alta Esta Semana</Badge>
          {hero.rating && <Badge color="rgba(201,168,76,0.1)" textColor={C.goldLight}>★ {hero.rating}/10</Badge>}
        </div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 42, fontWeight: 900, color: C.text, marginBottom: 8, lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>{hero.title}</h1>
        {hero.overview && (
          <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, marginBottom: 24, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{hero.overview}</p>
        )}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Btn variant="gold" onClick={() => onSelect(hero)} style={{ padding: "12px 28px", fontSize: 14 }}><PlayIcon /> Ver Detalhes</Btn>
          <Btn variant="ghost" onClick={() => onSelect(hero)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}><PlusIcon /> Minha Lista</Btn>
        </div>
      </div>

      {/* Hero indicators */}
      <div style={{ position: "absolute", bottom: 28, left: 48, display: "flex", gap: 8, zIndex: 2 }}>
        {movies.slice(0, 5).map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width: idx === i ? 28 : 8, height: 4, borderRadius: 2, background: idx === i ? C.gold : "rgba(255,255,255,0.3)", transition: "all 0.3s", cursor: "pointer" }} />
        ))}
      </div>

      {/* Mini posters right side */}
      <div style={{ position: "absolute", right: 40, bottom: 60, display: "flex", gap: 10, alignItems: "flex-end", zIndex: 1 }}>
        {movies.slice(0, 5).map((m, i) => (
          <div key={m.id} onClick={() => { setIdx(i); }}
            style={{ width: 72, cursor: "pointer", opacity: idx === i ? 1 : 0.5, transform: idx === i ? "scale(1.1)" : "scale(1)", transition: "all 0.3s" }}>
            <div style={{ height: 108, borderRadius: 6, overflow: "hidden", border: idx === i ? `2px solid ${C.gold}` : `1px solid ${C.border}`, boxShadow: idx === i ? `0 0 20px rgba(201,168,76,0.3)` : "none" }}>
              {m.poster && <img src={m.poster} alt={m.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  HOME PAGE (Netflix layout)
// ─────────────────────────────────────────────
function HomePage({ setPage, setSelectedMovie }) {
  const [genres, setGenres] = useState([]);
  const [activeG, setActiveG] = useState(null);

  const trendingFetcher = useCallback((p) => tmdb.trending(p), []);
  const popularFetcher = useCallback((p) => tmdb.popular(p), []);
  const topRatedFetcher = useCallback((p) => tmdb.topRated(p), []);

  const trend = usePaginatedMovies(trendingFetcher);
  const pop = usePaginatedMovies(popularFetcher);
  const top = usePaginatedMovies(topRatedFetcher);

  const [genreMovs, setGenreMovs] = useState([]);
  const [genrePage, setGenrePage] = useState(1);
  const [genreTotalPages, setGenreTotalPages] = useState(1);
  const [genreTotalResults, setGenreTotalResults] = useState(0);
  const [loadingG, setLoadingG] = useState(false);

  const loadGenre = useCallback((gid, p) => {
    setLoadingG(true);
    tmdb.byGenre(gid, p).then(d => {
      setGenreMovs((d.results || []).map(normalizeTmdb).filter(Boolean));
      setGenrePage(d.appPage || p);
      setGenreTotalPages(d.totalAppPages || 1);
      setGenreTotalResults(d.totalResults || 0);
      setLoadingG(false);
    }).catch(() => setLoadingG(false));
  }, []);

  useEffect(() => { tmdb.genres().then(g => setGenres(g.genres || [])).catch(() => { }); }, []);
  useEffect(() => { if (activeG) loadGenre(activeG.id, 1); }, [activeG, loadGenre]);

  const go = m => { setSelectedMovie(m); setPage("movie"); };
  const initialLoading = trend.loading && trend.movies.length === 0;

  return (
    <div style={{ paddingTop: 0, paddingBottom: 60 }}>
      {/* Hero Banner */}
      {trend.movies.length > 0 ? (
        <HeroBanner movies={trend.movies} onSelect={go} />
      ) : (
        initialLoading && <div style={{ height: 520, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} /></div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px" }}>
        {/* Trending Carousel */}
        <Section title="Em Alta Agora" action={{ label: "Buscar", onClick: () => setPage("search") }}>
          {trend.loading
            ? <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            : <Carousel movies={trend.movies} onMovieClick={go} />
          }
          <PaginationBar page={trend.page} totalPages={trend.totalPages} totalResults={trend.totalResults} onPageChange={trend.goTo} />
        </Section>

        {/* Genre explorer */}
        {genres.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>Explorar por Gênero</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {genres.map(g => (
                <button key={g.id} onClick={() => setActiveG(activeG?.id === g.id ? null : g)}
                  style={{ padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.2s", background: activeG?.id === g.id ? C.gold : C.bgCard, color: activeG?.id === g.id ? C.bgDeep : C.textMuted, border: `1px solid ${activeG?.id === g.id ? C.gold : C.border}` }}>
                  {g.name}
                </button>
              ))}
            </div>
            {activeG && (
              loadingG
                ? <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
                : <>
                  <Carousel movies={genreMovs} onMovieClick={go} />
                  <PaginationBar page={genrePage} totalPages={genreTotalPages} totalResults={genreTotalResults} onPageChange={(p) => loadGenre(activeG.id, p)} />
                </>
            )}
          </div>
        )}

        {/* Popular Carousel */}
        <Section title="Mais Populares">
          {pop.loading
            ? <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            : <Carousel movies={pop.movies} onMovieClick={go} />
          }
          <PaginationBar page={pop.page} totalPages={pop.totalPages} totalResults={pop.totalResults} onPageChange={pop.goTo} />
        </Section>

        {/* Top Rated Carousel */}
        <Section title="Melhor Avaliados">
          {top.loading
            ? <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            : <Carousel movies={top.movies} onMovieClick={go} />
          }
          <PaginationBar page={top.page} totalPages={top.totalPages} totalResults={top.totalResults} onPageChange={top.goTo} />
        </Section>
      </div>
      <FilmStripBg />
    </div>
  );
}

// ─────────────────────────────────────────────
//  MOVIE PAGE
// ─────────────────────────────────────────────
function MoviePage({ movieInit, setPage, setSelectedMovie }) {
  const { movie, loading, streamServices } = useMovieDetails(movieInit?.tmdbId || movieInit?.id);
  const m = movie || movieInit;
  const [watched, setWatched] = useState(false);
  const [liked, setLiked] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  if (loading && !m) return (
    <div style={{ paddingTop: 80, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}><Spinner size={38} /><p style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Carregando…</p></div>
    </div>
  );
  if (!m) return null;
  const reviews = MOCK_REVIEWS.filter(r => r.movieTmdbId === m.tmdbId).map(r => ({ ...r, user: MOCK_USERS.find(u => u.id === r.userId) }));

  return (
    <div style={{ paddingTop: 60, paddingBottom: 60, minHeight: "100vh" }}>
      <div style={{ height: 420, position: "relative", overflow: "hidden" }}>
        {m.backdrop
          ? <img src={m.backdrop} alt="" className="hero-backdrop" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }} />
          : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,#0a1e34,#1a2d48)` }} />
        }
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${C.bg} 100%)` }} />
        <button onClick={() => setPage("home")} style={{ position: "absolute", top: 20, left: 28, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(9,21,35,0.7)", color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 13, zIndex: 1 }}>
          <BackIcon /> Voltar
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "-200px auto 0", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 32, marginBottom: 40, alignItems: "flex-end" }}>
          <div style={{ width: 200, height: 300, borderRadius: 14, flexShrink: 0, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: `2px solid ${C.border}`, background: C.bgCard }}>
            {m.poster && <img src={m.posterHD || m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {(m.genres?.length ? m.genres : [m.genre]).slice(0, 4).map(g => <Badge key={g} color="rgba(201,168,76,0.10)" textColor={C.goldDim}>{g}</Badge>)}
              {m.rated && <Badge color={C.bgCard} textColor={C.textDim}>{m.rated}</Badge>}
              {m.year && <Badge color={C.bgCard} textColor={C.textDim}>{m.year}</Badge>}
              {m.runtime && <Badge color={C.bgCard} textColor={C.textDim}>{m.runtime} min</Badge>}
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 900, color: C.text, marginBottom: 4, lineHeight: 1.15 }}>{m.title}</h1>
            {m.tagline && <p style={{ color: C.gold, fontSize: 13, fontStyle: "italic", marginBottom: 14 }}>"{m.tagline}"</p>}
            <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
              {m.director && <div><span style={{ fontSize: 10, color: C.textDim, display: "block" }}>Direção</span><span style={{ fontSize: 13, color: C.textMuted }}>{m.director}</span></div>}
              {m.writer && <div><span style={{ fontSize: 10, color: C.textDim, display: "block" }}>Roteiro</span><span style={{ fontSize: 13, color: C.textMuted }}>{m.writer.split(",")[0]}</span></div>}
            </div>
            <div style={{ marginBottom: 16 }}>
              {loading && !m.imdbRating
                ? <div style={{ display: "flex", gap: 8 }}>{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: 72, height: 62, borderRadius: 10 }} />)}</div>
                : <RatingsRow movie={m} />}
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: C.textDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Onde Assistir no Brasil</p>
              <StreamingBadges services={streamServices} loading={loading && !streamServices.length} />
            </div>
            {(m.awards || m.boxOffice) && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {m.awards && <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 8, padding: "6px 12px" }}><p style={{ fontSize: 10, color: C.goldDim, marginBottom: 2 }}>Prêmios</p><p style={{ fontSize: 12, color: C.gold }}>{m.awards}</p></div>}
                {m.boxOffice && <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px" }}><p style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Bilheteria</p><p style={{ fontSize: 12, color: C.text }}>{m.boxOffice}</p></div>}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn variant={watched ? "ghost" : "gold"} onClick={() => setWatched(w => !w)}>{watched ? <><CheckIcon /> Assistido</> : <><PlusIcon /> Marcar Assistido</>}</Btn>
              <Btn variant="ghost" onClick={() => setLiked(l => !l)}><HeartIcon f={liked} /> Curtir</Btn>
              {m.trailer && <a href={`https://youtube.com/watch?v=${m.trailer}`} target="_blank" rel="noopener noreferrer"><Btn variant="ghost"><PlayIcon /> Trailer</Btn></a>}
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
                  {m.cast.map(actor => (
                    <div key={actor.id} style={{ textAlign: "center", flexShrink: 0, width: 78 }}>
                      <div style={{ width: 66, height: 66, borderRadius: "50%", overflow: "hidden", margin: "0 auto 6px", background: C.bgCard, border: `2px solid ${C.border}` }}>
                        {actor.photo ? <img src={actor.photo} alt={actor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: 0.4 }}>👤</div>}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.2 }}>{actor.name}</p>
                      <p style={{ fontSize: 10, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 78 }}>{actor.character}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            <Section title="Reviews da Comunidade">
              {watched && (
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>Sua avaliação</p>
                  <StarRating value={rating} max={5} size={22} interactive onChange={setRating} />
                  <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Escreva sua review…" rows={3}
                    style={{ width: "100%", marginTop: 12, padding: "10px 14px", borderRadius: 8, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, resize: "vertical", outline: "none" }} />
                  <Btn variant="gold" style={{ marginTop: 10 }} size="sm">Publicar</Btn>
                </div>
              )}
              {reviews.map((r, i) => (
                <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={r.user} size={34} />
                      <div><p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.user?.name}</p><p style={{ fontSize: 11, color: C.textDim }}>{r.date}</p></div>
                    </div>
                    <StarRating value={r.rating} size={13} />
                  </div>
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, fontStyle: "italic" }}>"{r.text}"</p>
                </div>
              ))}
              {reviews.length === 0 && !watched && <p style={{ color: C.textDim, textAlign: "center", padding: 40 }}>Nenhuma review ainda.</p>}
            </Section>
          </div>
          <div>
            {m.similar?.length > 0 && (
              <Section title="Similares">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {m.similar.slice(0, 4).map(s => (
                    <div key={s.id} onClick={() => { setSelectedMovie(s); setPage("movie"); }}
                      style={{ display: "flex", gap: 10, cursor: "pointer", padding: 8, borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}>
                      <div style={{ width: 44, height: 66, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: C.bgDeep }}>
                        {s.poster && <img src={s.poster} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <div><p style={{ fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 2 }}>{s.title}</p><p style={{ fontSize: 11, color: C.textDim }}>{s.year}</p>{s.rating && <p style={{ fontSize: 11, color: C.gold }}>★ {s.rating}</p>}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {m.recommendations?.length > 0 && (
              <Section title="Recomendados">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {m.recommendations.slice(0, 4).map(s => (
                    <div key={s.id} onClick={() => { setSelectedMovie(s); setPage("movie"); }}
                      style={{ display: "flex", gap: 10, cursor: "pointer", padding: 8, borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}>
                      <div style={{ width: 44, height: 66, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: C.bgDeep }}>
                        {s.poster && <img src={s.poster} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <div><p style={{ fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 2 }}>{s.title}</p><p style={{ fontSize: 11, color: C.textDim }}>{s.year}</p>{s.rating && <p style={{ fontSize: 11, color: C.gold }}>★ {s.rating}</p>}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SEARCH PAGE
// ─────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Mais Populares" },
  { value: "vote_average.desc", label: "Melhor Avaliados" },
  { value: "primary_release_date.desc", label: "Mais Recentes" },
  { value: "revenue.desc", label: "Maior Bilheteria" },
];
const LANG_OPTIONS = [
  { value: "", label: "Todos" }, { value: "en", label: "Inglês" }, { value: "pt", label: "Português" },
  { value: "es", label: "Espanhol" }, { value: "fr", label: "Francês" }, { value: "ja", label: "Japonês" },
  { value: "ko", label: "Coreano" }, { value: "de", label: "Alemão" }, { value: "it", label: "Italiano" },
  { value: "hi", label: "Hindi" }, { value: "zh", label: "Chinês" },
];

function SearchPage({ setPage, setSelectedMovie }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [lang, setLang] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const debRef = useRef(null);

  useEffect(() => { tmdb.genres().then(d => setGenres(d.genres || [])).catch(() => { }); }, []);

  const doSearch = useCallback(async (q, pg) => {
    setLoading(true);
    const d = await tmdb.search(q, pg).catch(() => ({ results: [], total_results: 0, total_pages: 1 }));
    setResults((d.results || []).map(normalizeTmdb).filter(Boolean));
    setTotalResults(d.total_results || 0);
    setTotalPages(Math.min(d.total_pages || 1, 500));
    setCurrentPage(pg);
    setLoading(false);
  }, []);

  const doDiscover = useCallback(async (pg) => {
    setLoading(true);
    const params = { sort_by: sortBy };
    if (selectedGenres.length > 0) params.with_genres = selectedGenres.join(",");
    if (yearFrom) params["primary_release_date.gte"] = `${yearFrom}-01-01`;
    if (yearTo) params["primary_release_date.lte"] = `${yearTo}-12-31`;
    if (ratingMin) params["vote_average.gte"] = ratingMin;
    if (lang) params.with_original_language = lang;
    if (ratingMin) params["vote_count.gte"] = "50";
    params.page = String(pg);
    const d = await tmdb.get("/discover/movie", params).catch(() => ({ results: [], total_results: 0, total_pages: 1 }));
    setResults((d.results || []).map(normalizeTmdb).filter(Boolean));
    setTotalResults(d.total_results || 0);
    setTotalPages(Math.min(d.total_pages || 1, 500));
    setCurrentPage(pg);
    setLoading(false);
  }, [sortBy, selectedGenres, yearFrom, yearTo, ratingMin, lang]);

  useEffect(() => {
    clearTimeout(debRef.current);
    if (!query.trim()) {
      if (selectedGenres.length > 0 || yearFrom || yearTo || ratingMin || lang) doDiscover(1);
      else { setResults([]); setTotalResults(0); setTotalPages(1); }
      return;
    }
    debRef.current = setTimeout(() => doSearch(query, 1), 360);
    return () => clearTimeout(debRef.current);
  }, [query]);

  useEffect(() => {
    if (query.trim()) return;
    if (selectedGenres.length > 0 || yearFrom || yearTo || ratingMin || lang || sortBy !== "popularity.desc") doDiscover(1);
    else { setResults([]); setTotalResults(0); setTotalPages(1); }
  }, [selectedGenres, sortBy, yearFrom, yearTo, ratingMin, lang, doDiscover]);

  const toggleGenre = (gid) => setSelectedGenres(prev => prev.includes(gid) ? prev.filter(id => id !== gid) : [...prev, gid]);
  const handlePageChange = (pg) => { if (query.trim()) doSearch(query, pg); else doDiscover(pg); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const clearFilters = () => { setSelectedGenres([]); setSortBy("popularity.desc"); setYearFrom(""); setYearTo(""); setRatingMin(""); setLang(""); };
  const hasFilters = selectedGenres.length > 0 || sortBy !== "popularity.desc" || yearFrom || yearTo || ratingMin || lang;
  const currentYear = new Date().getFullYear();
  const selectStyle = { padding: "8px 12px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", minWidth: 140, cursor: "pointer" };
  const inputSmStyle = { padding: "8px 12px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", width: 80, textAlign: "center" };

  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.text }}>Buscar <span style={{ color: C.gold }}>Filmes</span></h1>
          <button onClick={() => setShowFilters(!showFilters)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: showFilters ? C.gold : C.bgCard, color: showFilters ? C.bgDeep : C.textMuted, border: `1px solid ${showFilters ? C.gold : C.border}`, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
            Filtros {hasFilters && <span style={{ background: showFilters ? C.bgDeep : C.gold, color: showFilters ? C.gold : C.bgDeep, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>●</span>}
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><SearchSVG size={18} /></div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por título…"
            style={{ width: "100%", paddingLeft: 48, paddingRight: 20, paddingTop: 14, paddingBottom: 14, borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, fontSize: 15, outline: "none", transition: "border-color 0.2s" }}
            onFocus={e => e.target.style.borderColor = C.gold} onBlur={e => e.target.style.borderColor = C.border} />
          {loading && <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}><Spinner size={18} /></div>}
        </div>

        {showFilters && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>Gêneros</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {genres.map(g => (
                  <button key={g.id} onClick={() => toggleGenre(g.id)}
                    style={{ padding: "5px 14px", borderRadius: 16, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.2s", background: selectedGenres.includes(g.id) ? C.gold : "transparent", color: selectedGenres.includes(g.id) ? C.bgDeep : C.textMuted, border: `1px solid ${selectedGenres.includes(g.id) ? C.gold : C.border}`, cursor: "pointer" }}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Ordenar</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Ano</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="number" min="1888" max={currentYear} placeholder="De" value={yearFrom} onChange={e => setYearFrom(e.target.value)} style={inputSmStyle} />
                  <span style={{ color: C.textDim, fontSize: 12 }}>—</span>
                  <input type="number" min="1888" max={currentYear} placeholder="Até" value={yearTo} onChange={e => setYearTo(e.target.value)} style={inputSmStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Nota mínima</label>
                <select value={ratingMin} onChange={e => setRatingMin(e.target.value)} style={selectStyle}>
                  <option value="">Qualquer</option>
                  {[9, 8, 7, 6, 5, 4, 3].map(n => <option key={n} value={String(n)}>≥ {n}/10</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Idioma</label>
                <select value={lang} onChange={e => setLang(e.target.value)} style={selectStyle}>
                  {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {hasFilters && <button onClick={clearFilters} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", color: C.gold, border: `1px solid ${C.gold}`, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>✕ Limpar</button>}
            </div>
          </div>
        )}

        {totalResults > 0 && (
          <p style={{ color: C.textDim, fontSize: 13, marginBottom: 16 }}>
            {totalResults.toLocaleString("pt-BR")} resultado{totalResults !== 1 ? "s" : ""}
            {query && <span style={{ color: C.gold }}> · "{query}"</span>}
            {hasFilters && !query && <span style={{ color: C.gold }}> · filtros aplicados</span>}
          </p>
        )}

        {results.length > 0 ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
              {results.map(m => <MovieCard key={m.id} movie={m} onClick={() => { setSelectedMovie(m); setPage("movie"); }} />)}
            </div>
            <PaginationBar page={currentPage} totalPages={totalPages} totalResults={totalResults} onPageChange={handlePageChange} />
          </>
        ) : (
          !loading && (query || hasFilters) ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
              <p style={{ fontSize: 15 }}>Nenhum resultado encontrado</p>
            </div>
          ) : null
        )}

        {!query && !hasFilters && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🎬</p>
            <p style={{ fontSize: 15 }}>Digite um título ou use os filtros para explorar</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PROFILE PAGE
// ─────────────────────────────────────────────
function ProfilePage({ user, setPage, isOwnProfile = true }) {
  const u = user || MOCK_USERS[3];
  const [tab, setTab] = useState("reviews");
  const reviews = MOCK_REVIEWS.filter(r => r.userId === u.id).map(r => ({ ...r, user: u }));
  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ height: 170, borderRadius: "16px 16px 0 0", background: `linear-gradient(135deg,${C.bgDeep},${C.bgCardHover})`, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 30px,rgba(201,168,76,0.03) 30px,rgba(201,168,76,0.03) 31px)` }} />
          {!isOwnProfile && <button onClick={() => setPage("home")} style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(9,21,35,0.6)", color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 13 }}><BackIcon /> Voltar</button>}
        </div>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 16px 16px", padding: "0 28px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: -36 }}>
              <div style={{ width: 86, height: 86, borderRadius: "50%", background: u.color, border: `3px solid ${C.bgCard}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display',serif" }}>{u.initials}</div>
              <div style={{ paddingBottom: 4 }}>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 700, color: C.text }}>{u.name}</h1>
                <p style={{ color: C.textMuted, fontSize: 13 }}>@{u.username}</p>
              </div>
            </div>
            {isOwnProfile ? <Btn variant="ghost" style={{ marginBottom: 4 }}>Editar Perfil</Btn> : <Btn variant="gold" style={{ marginBottom: 4 }}><PlusIcon /> Seguir</Btn>}
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {[["Reviews", u.reviews], ["Amigos", u.friends], ["Clubs", MOCK_GROUPS.filter(g => g.members.includes(u.id)).length]].map(([l, v]) => (
              <div key={l}><p style={{ fontSize: 21, fontWeight: 700, color: C.gold, fontFamily: "'Playfair Display',serif" }}>{v}</p><p style={{ fontSize: 12, color: C.textMuted }}>{l}</p></div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
          {[["reviews", "Reviews"], ["friends", "Amigos"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 22px", fontSize: 13, fontWeight: 500, color: tab === id ? C.gold : C.textMuted, borderBottom: `2px solid ${tab === id ? C.gold : "transparent"}`, transition: "all 0.2s", marginBottom: -1 }}>{label}</button>
          ))}
        </div>
        {tab === "reviews" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviews.length > 0 ? reviews.map((r, i) => (
              <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>TMDb #{r.movieTmdbId}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}><StarRating value={r.rating} size={13} /><span style={{ fontSize: 11, color: C.textDim }}>{r.date}</span></div>
                </div>
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>"{r.text}"</p>
              </div>
            )) : <p style={{ color: C.textDim, textAlign: "center", padding: 40 }}>Nenhuma review ainda.</p>}
          </div>
        )}
        {tab === "friends" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
            {MOCK_USERS.filter(u2 => u2.id !== u.id).map(friend => (
              <div key={friend.id} className="card-hover" onClick={() => setPage("friend")}
                style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Avatar user={friend} size={54} />
                <div style={{ textAlign: "center" }}><p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{friend.name}</p><p style={{ fontSize: 12, color: C.textMuted }}>@{friend.username}</p></div>
                <div style={{ display: "flex", gap: 20 }}>
                  {[["reviews", friend.reviews], ["amigos", friend.friends]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: "center" }}><p style={{ fontSize: 14, fontWeight: 600, color: C.gold }}>{v}</p><p style={{ fontSize: 11, color: C.textDim }}>{l}</p></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  GROUPS PAGE
// ─────────────────────────────────────────────
function GroupsPage({ setPage, setSelectedGroup }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6 }}>Meus <span style={{ color: C.gold }}>Clubs</span></h1>
            <p style={{ color: C.textMuted, fontSize: 13 }}>Listas colaborativas com seus amigos</p>
          </div>
          <Btn variant="gold" onClick={() => setShowCreate(true)}><PlusIcon /> Criar Club</Btn>
        </div>
        {showCreate && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.gold}`, borderRadius: 16, padding: 24, marginBottom: 22, animation: "fadeIn 0.2s ease" }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, color: C.text, marginBottom: 16 }}>Novo Club</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <TextInput label="Nome do Club" value={name} onChange={setName} placeholder="Ex: Cinéphiles de Sexta" style={{ flex: 1 }} />
              <TextInput label="Convidar (username)" value="" onChange={() => { }} placeholder="@username" style={{ flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Btn variant="gold" size="sm">Criar</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Btn>
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {MOCK_GROUPS.map(group => {
            const members = MOCK_USERS.filter(u => group.members.includes(u.id));
            const allIds = [...new Set(Object.values(GROUP_RECS[group.id] || {}).flat())];
            return (
              <div key={group.id} className="card-hover" onClick={() => { setSelectedGroup(group); setPage("group"); }}
                style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{group.name}</h3>
                    <p style={{ fontSize: 12, color: C.textDim }}>{members.length} membros · {allIds.length} filmes</p>
                  </div>
                  <div style={{ display: "flex" }}>{members.slice(0, 3).map((m, i) => <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }}><Avatar user={m} size={28} /></div>)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {allIds.slice(0, 5).map(id => (
                    <div key={id} style={{ width: 46, height: 68, borderRadius: 5, background: C.bgDeep, border: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
                      <MiniPoster tmdbId={id} />
                    </div>
                  ))}
                  {allIds.length > 5 && <div style={{ width: 46, height: 68, borderRadius: 5, background: C.accentSoft, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.textMuted }}>+{allIds.length - 5}</div>}
                </div>
                <span style={{ fontSize: 12, color: C.gold }}>Ver club →</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  GROUP DETAIL PAGE
// ─────────────────────────────────────────────
function GroupPage({ group, setPage, setSelectedMovie }) {
  const g = group || MOCK_GROUPS[0];
  const members = MOCK_USERS.filter(u => g.members.includes(u.id));
  const recIds = GROUP_RECS[g.id] || {};
  const [movieMap, setMovieMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState(["Todos"]);
  const [genreF, setGenreF] = useState("Todos");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");

  useEffect(() => {
    const allIds = [...new Set(Object.values(recIds).flat())];
    Promise.all(allIds.map(id =>
      cachedFetch(`detail_${id}`, () =>
        tmdbProxy({ data: { path: `/movie/${id}`, params: {} } })
      ).then(normalizeTmdb).catch(() => null)
    )).then(movies => {
      const map = {};
      allIds.forEach((id, i) => { if (movies[i]) map[id] = movies[i]; });
      setMovieMap(map);
      const gs = ["Todos", ...new Set(Object.values(map).map(m => m.genre).filter(Boolean))];
      setGenres(gs);
      setLoading(false);
    });
  }, [g.id]);

  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: "26px 28px", marginBottom: 26 }}>
          <button onClick={() => setPage("groups")} style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 13, marginBottom: 14 }}><BackIcon /> Meus Clubs</button>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>{g.name}</h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {members.map(m => <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6 }}><Avatar user={m} size={22} /><span style={{ fontSize: 12, color: C.textMuted }}>{m.name}</span></div>)}
          </div>
        </div>

        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 18px", marginBottom: 26, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><SearchSVG size={13} /></div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar no club…"
              style={{ width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {genres.map(g2 => (
              <button key={g2} onClick={() => setGenreF(g2)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.2s", background: genreF === g2 ? C.gold : C.bgDeep, color: genreF === g2 ? C.bgDeep : C.textMuted, border: `1px solid ${genreF === g2 ? C.gold : C.border}` }}>{g2}</button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.textMuted, outline: "none" }}>
            <option value="default">Padrão</option>
            <option value="rating">Melhor nota</option>
            <option value="year">Mais recente</option>
            <option value="popularity">Popularidade</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ textAlign: "center" }}><Spinner size={36} /><p style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Carregando…</p></div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {members.map(member => {
              const ids = recIds[member.id] || [];
              let movies = ids.map(id => movieMap[id]).filter(Boolean);
              if (genreF !== "Todos") movies = movies.filter(m => m.genre === genreF);
              if (search) movies = movies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
              if (sort === "rating") movies = [...movies].sort((a, b) => (b.rating || 0) - (a.rating || 0));
              if (sort === "year") movies = [...movies].sort((a, b) => (b.year || 0) - (a.year || 0));
              if (sort === "popularity") movies = [...movies].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
              if (!movies.length) return null;
              return (
                <div key={member.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                    <Avatar user={member} size={46} />
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>{member.name}</h3>
                      <p style={{ fontSize: 12, color: C.textMuted }}>@{member.username} · {movies.length} recomendaç{movies.length === 1 ? "ão" : "ões"}</p>
                    </div>
                  </div>
                  <Carousel movies={movies} onMovieClick={(mv) => { setSelectedMovie(mv); setPage("movie"); }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SPLASH SCREEN
// ─────────────────────────────────────────────
function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("in"); // in -> out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 2000);
    const t2 = setTimeout(() => onFinish(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: `radial-gradient(ellipse at center, ${C.bgCardHover}, ${C.bg})`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: phase === "out" ? "splashFadeOut 0.5s ease forwards" : undefined,
    }}>
      {/* 4-point star */}
      <svg width={48} height={48} viewBox="0 0 24 24" fill={C.gold}
        style={{ animation: "splashStarSpin 1s ease-out forwards", marginBottom: 24 }}>
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
      </svg>

      {/* Logo */}
      <h1 style={{
        fontFamily: "'Playfair Display',serif", fontSize: 48, fontWeight: 900, color: C.gold,
        letterSpacing: "0.15em", animation: "splashFadeIn 0.8s ease 0.3s both",
      }}>
        MOVIECLUB
      </h1>

      {/* Subtitle */}
      <p style={{
        fontFamily: "'Playfair Display',serif", fontSize: 12, color: C.goldDim,
        textTransform: "uppercase", marginTop: 12,
        animation: "splashSubtitle 1s ease 0.6s both",
      }}>
        Shared Film Platform
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
//  LOGIN PAGE (redesigned)
// ─────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""), [pass, setPass] = useState(""), [name, setName] = useState(""), [username, setUsername] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Background effects */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 80% 60% at 30% 20%, rgba(201,168,76,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 70% 80%, rgba(37,99,235,0.04) 0%, transparent 60%)`, pointerEvents: "none" }} />

      <div style={{ width: 440, position: "relative", zIndex: 1 }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: 36, animation: "staggerUp 0.6s ease 0.1s both" }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill={C.gold} style={{ marginBottom: 16 }}>
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
          </svg>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, color: C.gold, letterSpacing: "0.12em", marginBottom: 4 }}>MOVIECLUB</h1>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 10, color: C.goldDim, textTransform: "uppercase", letterSpacing: "0.25em" }}>Shared Film Platform</p>
        </div>

        {/* Card */}
        <div style={{
          background: `linear-gradient(180deg, ${C.bgCard}, ${C.bgDeep})`,
          border: `1px solid ${C.border}`, borderRadius: 20,
          padding: "36px 32px", boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
          animation: "staggerUp 0.6s ease 0.2s both",
        }}>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 22, textAlign: "center" }}>
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </p>

          {/* Toggle */}
          <div style={{ display: "flex", marginBottom: 24, background: "rgba(9,21,35,0.5)", borderRadius: 12, padding: 3 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "9px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: mode === m ? C.bgCard : "transparent",
                color: mode === m ? C.text : C.textMuted,
                border: mode === m ? `1px solid ${C.border}` : "1px solid transparent",
                transition: "all 0.2s",
              }}>
                {m === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "staggerUp 0.5s ease 0.3s both" }}>
            {mode === "signup" && (
              <>
                <TextInput label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
                <TextInput label="Username" value={username} onChange={setUsername} placeholder="@username" />
              </>
            )}
            <TextInput label="Email" value={email} onChange={setEmail} placeholder="voce@email.com" type="email" />
            <TextInput label="Senha" value={pass} onChange={setPass} placeholder="••••••••" type="password" />
          </div>

          {/* Submit */}
          <button onClick={onLogin} className="btn-gold-shimmer"
            style={{
              width: "100%", marginTop: 24, padding: "13px", color: C.bgDeep,
              borderRadius: 12, fontSize: 14, fontWeight: 700,
              fontFamily: "'Playfair Display',serif", letterSpacing: "0.06em",
              transition: "transform 0.15s, box-shadow 0.2s",
              boxShadow: "0 4px 20px rgba(201,168,76,0.25)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(201,168,76,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(201,168,76,0.25)"; }}>
            {mode === "login" ? "Entrar" : "Criar Conta"}
          </button>

          {/* Social login */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p style={{ color: C.textDim, fontSize: 11, marginBottom: 12 }}>ou continue com</p>
            <div style={{ display: "flex", gap: 10 }}>
              {["Google", "Apple"].map(p => (
                <button key={p} onClick={onLogin} style={{
                  flex: 1, padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 500,
                  background: "rgba(9,21,35,0.5)", color: C.textMuted,
                  border: `1px solid ${C.border}`, transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.goldDim; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <FilmStripBg />
    </div>
  );
}

// ─────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────
export default function MovieClubApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState("home");
  const [selectedMovie, setSM] = useState(null);
  const [selectedGroup, setSG] = useState(null);
  const [apiStatus, setApiStatus] = useState({ tmdb: false, omdb: false, streaming: false });

  useEffect(() => {
    tmdb.popular().then(d => { if (d?.results) setApiStatus(s => ({ ...s, tmdb: true })); }).catch(() => { });
  }, []);

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  if (showSplash) return <SplashScreen onFinish={handleSplashDone} />;
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Navbar page={page} setPage={setPage} hasKeys={true} apiStatus={apiStatus} />
      <div className="page-enter" key={page}>
        {page === "home" && <HomePage setPage={setPage} setSelectedMovie={setSM} />}
        {page === "profile" && <ProfilePage user={MOCK_USERS[3]} setPage={setPage} isOwnProfile />}
        {page === "friend" && <ProfilePage user={MOCK_USERS[1]} setPage={setPage} isOwnProfile={false} />}
        {page === "movie" && <MoviePage movieInit={selectedMovie} setPage={setPage} setSelectedMovie={setSM} />}
        {page === "groups" && <GroupsPage setPage={setPage} setSelectedGroup={setSG} />}
        {page === "group" && <GroupPage group={selectedGroup} setPage={setPage} setSelectedMovie={setSM} />}
        {page === "search" && <SearchPage setPage={setPage} setSelectedMovie={setSM} />}
        {page === "settings" && <SettingsPage apiStatus={apiStatus} />}
      </div>
    </div>
  );
}
