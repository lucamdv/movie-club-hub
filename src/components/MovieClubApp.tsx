// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { tmdbProxy, omdbProxy, streamingProxy } from "@/lib/movie-api.functions";

// ─────────────────────────────────────────────
//  DESIGN TOKENS
// ─────────────────────────────────────────────
const C = {
  bg: "#0D1B2A", bgCard: "#112236", bgCardHover: "#16293F", bgDeep: "#091523",
  gold: "#C9A84C", goldLight: "#E2C97E", goldDim: "#8A6E30",
  text: "#F0EDE6", textMuted: "#8A9BB0", textDim: "#4A5E72",
  border: "#1E3347", borderHover: "#2A4660",
  accent: "#2563EB", accentSoft: "#1E3A5F",
  success: "#22C55E", red: "#EF4444", orange: "#F97316",
  netflix: "#E50914", prime: "#00A8E1", disney: "#113CCF",
  hbo: "#5822B4", apple: "#888888", paramount: "#0064FF", hulu: "#1CE783",
};

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};overflow-x:hidden}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${C.bgDeep}}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:${C.borderHover}}
button{cursor:pointer;border:none;background:none;font-family:inherit}
input,textarea,select{font-family:inherit}
@keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes filmRoll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes starPop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.3)}100%{transform:scale(1);opacity:1}}
@keyframes shimmerSlide{0%{background-position:200% 0}100%{background-position:-200% 0}}
.page-enter{animation:fadeIn 0.3s ease forwards}
.card-hover{transition:transform 0.22s ease,border-color 0.22s ease,background 0.22s ease}
.card-hover:hover{transform:translateY(-4px);border-color:${C.borderHover};background:${C.bgCardHover}}
.skeleton{background:linear-gradient(90deg,${C.bgCard} 25%,${C.border} 50%,${C.bgCard} 75%);background-size:200% 100%;animation:shimmerSlide 1.6s ease infinite}
.film-strip-bg{position:fixed;bottom:0;left:0;right:0;height:44px;pointer-events:none;z-index:0;overflow:hidden;opacity:0.06}
.film-strip-inner{display:flex;gap:0;white-space:nowrap;animation:filmRoll 28s linear infinite}
`;

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

const TMDB_IMG  = "https://image.tmdb.org/t/p";

const tmdb = {
  async get(path, params = {}) {
    const cacheKey = `tmdb:${path}:${JSON.stringify(params)}`;
    return cachedFetch(cacheKey, () => tmdbProxy({ data: { path, params } }));
  },
  /** Fetch exactly 2 TMDb pages (40 movies) for a given app-page number */
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
    return {
      results,
      appPage,
      totalAppPages,
      totalResults: r1?.total_results || 0,
    };
  },
  poster(path, size = "w300") { return path ? `${TMDB_IMG}/${size}${path}` : null; },
  backdrop(path, size = "w1280") { return path ? `${TMDB_IMG}/${size}${path}` : null; },
  async trending(page = 1)          { return this.getPage("/trending/movie/week", page); },
  async popular(page = 1)           { return this.getPage("/movie/popular", page); },
  async topRated(page = 1)          { return this.getPage("/movie/top_rated", page); },
  async details(id)                 { return this.get(`/movie/${id}`, { append_to_response: "credits,videos,similar,recommendations" }); },
  async search(q, page = 1)         { return this.get("/search/movie", { query: q, page: String(page) }); },
  async genres()                    { return this.get("/genre/movie/list"); },
  async byGenre(gid, page = 1)      { return this.getPage("/discover/movie", page, { with_genres: String(gid), sort_by: "popularity.desc" }); },
};

const omdb = {
  async get(params) {
    const cacheKey = `omdb:${JSON.stringify(params)}`;
    return cachedFetch(cacheKey, () => omdbProxy({ data: { params } }));
  },
  async byImdbId(id)           { return this.get({ i: id, plot: "full" }); },
  async byTitle(title, year)   { return this.get({ t: title, plot: "short", ...(year ? { y: String(year) } : {}) }); },
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
  netflix:   { name: "Netflix",     color: "#E50914", icon: "N"  },
  prime:     { name: "Prime Video", color: "#00A8E1", icon: "P"  },
  disney:    { name: "Disney+",     color: "#113CCF", icon: "D+" },
  hbo:       { name: "Max",         color: "#5822B4", icon: "M"  },
  apple:     { name: "Apple TV+",   color: "#888888", icon: "A"  },
  paramount: { name: "Paramount+",  color: "#0064FF", icon: "P+" },
  hulu:      { name: "Hulu",        color: "#1CE783", icon: "H"  },
  mubi:      { name: "MUBI",        color: "#001C42", icon: "M"  },
  globoplay: { name: "Globoplay",   color: "#E10048", icon: "G"  },
};

function parseStreamingServices(raw) {
  if (!raw) return [];
  // Streaming Availability API v3/v4 — handles both shape variants
  // v4: raw.streamingOptions = { br: { netflix: [...], prime: [...] } }
  // v3: raw.streamingInfo     = { br: { netflix: {...}, prime: {...} } }
  const br = raw.streamingOptions?.br
    || raw.streamingOptions?.us
    || raw.streamingInfo?.br
    || raw.streamingInfo?.us
    || {};
  // Also handle v4 flat array: raw = { result: { streamingOptions: { br: [...] } } }
  const opts = Array.isArray(br)
    ? br.reduce((acc, s) => { if (!acc[s.service]) acc[s.service] = []; acc[s.service].push(s); return acc; }, {})
    : br;
  return Object.entries(opts).flatMap(([svc, entries]) => {
    const meta = STREAM_META[svc] || { name: svc, color: C.textDim, icon: svc[0]?.toUpperCase() || "?" };
    const list = Array.isArray(entries) ? entries : [entries];
    return list.slice(0, 1).map(entry => ({
      service: svc,
      name: meta.name,
      color: meta.color,
      icon: meta.icon,
      type: entry?.type || "subscription",
      link: entry?.link || entry?.url || null,
      quality: entry?.quality || entry?.videoQuality || null,
      price: entry?.price?.formatted || (entry?.price ? `$${entry.price}` : null),
      leaving: entry?.leaving ? new Date(entry.leaving * 1000).toLocaleDateString("pt-BR") : null,
    }));
  }).filter(s => s.name).sort((a, b) => {
    // subscription first, then rent, then buy
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

// ─────────────────────────────────────────────
//  SOCIAL MOCK DATA
// ─────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: "Alex Mercer",  username: "alexm",    initials: "AM", color: "#2563EB", reviews: 12, friends: 8  },
  { id: 2, name: "Sofia Reyes",  username: "sofiar",   initials: "SR", color: "#9333EA", reviews: 27, friends: 15 },
  { id: 3, name: "Kai Nakamura", username: "kain",     initials: "KN", color: "#16A34A", reviews: 9,  friends: 6  },
  { id: 4, name: "Luca Mago",    username: "lucamago", initials: "LM", color: C.gold,    reviews: 19, friends: 11 },
];
const MOCK_REVIEWS = [
  { movieTmdbId: 872585, userId: 4, rating: 5, text: "Uma obra monumental. Nolan superou tudo. A cena da detonação é de tirar o fôlego.",          date: "15 Jan 2024" },
  { movieTmdbId: 693134, userId: 4, rating: 4, text: "Villeneuve consolida sua visão épica. A segunda parte entrega tudo que a primeira prometeu.", date: "3 Mar 2024"  },
  { movieTmdbId: 792307, userId: 4, rating: 5, text: "Lanthimos em sua melhor forma. Emma Stone está absolutamente fora de si.",                   date: "8 Fev 2024"  },
];
const MOCK_GROUPS = [
  { id: 1, name: "Cinéphiles do Recife", members: [1,2,3,4] },
  { id: 2, name: "Weekend Watchlist",    members: [1,4]     },
];
const GROUP_RECS = {
  1: { 1:[872585,693134,792307,940551], 2:[872585,976573,1014577,693134], 3:[507089,940551,872585,792307], 4:[872585,693134,792307,1011985] },
  2: { 1:[872585,792307], 4:[693134,940551] },
};

// ─────────────────────────────────────────────
//  PRIMITIVES
// ─────────────────────────────────────────────
const Spinner = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke={C.gold} strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const SkeletonCard = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    <div className="skeleton" style={{ width:130, height:195, borderRadius:8 }}/>
    <div className="skeleton" style={{ width:"80%", height:12, borderRadius:4 }}/>
    <div className="skeleton" style={{ width:"50%", height:10, borderRadius:4 }}/>
  </div>
);

function StarRating({ value, max=5, size=14, interactive=false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:"flex", gap:2 }}>
      {Array.from({length:max},(_,i)=>{
        const filled = (hover||value)>i;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24"
            fill={filled?C.gold:"none"} stroke={filled?C.gold:C.textDim} strokeWidth="1.5"
            style={{ cursor:interactive?"pointer":"default", transition:"transform 0.1s" }}
            onMouseEnter={()=>interactive&&setHover(i+1)}
            onMouseLeave={()=>interactive&&setHover(0)}
            onClick={()=>interactive&&onChange?.(i+1)}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        );
      })}
    </div>
  );
}

function Avatar({ user, size=40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:user?.color||C.accentSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:600, color:"#fff", flexShrink:0, border:`2px solid ${C.border}` }}>
      {user?.initials||"?"}
    </div>
  );
}

function Badge({ children, color=C.accentSoft, textColor=C.textMuted, small=false }) {
  return (
    <span style={{ background:color, color:textColor, fontSize:small?10:11, fontWeight:500, padding:small?"2px 7px":"3px 10px", borderRadius:20, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant="ghost", size="md", style:sx={}, disabled=false }) {
  const base = { display:"inline-flex", alignItems:"center", gap:6, borderRadius:10, fontSize:size==="sm"?12:13, fontWeight:600, padding:size==="sm"?"6px 14px":"10px 22px", transition:"all 0.18s", opacity:disabled?0.5:1, cursor:disabled?"not-allowed":"pointer" };
  const variants = {
    gold:    { background:`linear-gradient(135deg,${C.goldDim},${C.gold})`, color:C.bgDeep },
    ghost:   { background:C.bgCard, color:C.textMuted, border:`1px solid ${C.border}` },
    outline: { background:"transparent", color:C.textMuted, border:`1px solid ${C.border}` },
  };
  return (
    <button onClick={disabled?undefined:onClick} style={{...base,...variants[variant],...sx}}
      onMouseEnter={e=>{if(!disabled){e.currentTarget.style.opacity="0.85";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.transform="";}}
    >{children}</button>
  );
}

function TextInput({ label, value, onChange, placeholder, type="text", note, style:sx={} }) {
  return (
    <div style={sx}>
      {label&&<label style={{ display:"block", fontSize:12, color:C.textMuted, marginBottom:6, fontWeight:500 }}>{label}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 14px", borderRadius:8, background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text, fontSize:13, outline:"none", transition:"border-color 0.2s" }}
        onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
      {note&&<p style={{ fontSize:11, color:C.textDim, marginTop:4 }}>{note}</p>}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom:40 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:17, fontWeight:600, color:C.text, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:3, height:16, background:C.gold, borderRadius:2, display:"inline-block" }}/>
          {title}
        </h2>
        {action&&<button onClick={action.onClick} style={{ fontSize:12, color:C.gold, fontWeight:500 }}>{action.label} →</button>}
      </div>
      {children}
    </div>
  );
}

function FilmStripBg() {
  const n = Array.from({length:80},(_,i)=>i);
  return (
    <div className="film-strip-bg">
      <div className="film-strip-inner">
        {[...n,...n].map((_,i)=>(
          <div key={i} style={{ width:30, height:44, background:C.bgDeep, borderRight:`2px solid ${C.border}`, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"5px 4px", flexShrink:0 }}>
            <div style={{ width:"100%", height:7, background:C.border, borderRadius:2 }}/>
            <div style={{ width:"100%", height:7, background:C.border, borderRadius:2 }}/>
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
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {[1,2,3].map(i=><div key={i} className="skeleton" style={{ width:110, height:36, borderRadius:9 }}/>)}
    </div>
  );
  if (!services?.length) return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:9, background:"rgba(74,94,114,0.12)", border:`1px dashed ${C.border}` }}>
      <span style={{ fontSize:14 }}>📡</span>
      <p style={{ fontSize:12, color:C.textDim, fontStyle:"italic" }}>Não encontrado em streaming no Brasil</p>
    </div>
  );
  const typeLabel = { subscription:"Incluso", free:"Grátis", rent:"Aluguel", buy:"Comprar" };
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      {services.map((s,i)=>(
        <a key={i} href={s.link||"#"} target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"7px 13px", borderRadius:9,
            background:`${s.color}18`, border:`1px solid ${s.color}40`, color:s.color,
            fontSize:12, fontWeight:600, textDecoration:"none", transition:"all 0.2s", flexDirection:"column", minWidth:90 }}
          onMouseEnter={e=>{ e.currentTarget.style.background=`${s.color}30`; e.currentTarget.style.transform="translateY(-2px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background=`${s.color}18`; e.currentTarget.style.transform=""; }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, fontWeight:900, lineHeight:1 }}>{s.icon}</span>
            <span style={{ fontSize:12 }}>{s.name}</span>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ fontSize:10, opacity:0.75, fontWeight:500 }}>{s.price || typeLabel[s.type] || s.type}</span>
            {s.quality&&<span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:`${s.color}30`, fontWeight:700 }}>{s.quality}</span>}
          </div>
          {s.leaving&&<span style={{ fontSize:9, color:C.orange, opacity:0.9 }}>Sai em {s.leaving}</span>}
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
    movie.rating     && { src:"TMDb",  val:`${movie.rating}`, suffix:"/10", pct: (movie.rating/10)*100, color:"#01B4E4", sub: movie.voteCount ? `${(movie.voteCount/1000).toFixed(0)}k votos` : null },
    movie.imdbRating && { src:"IMDb",  val:`${movie.imdbRating}`, suffix:"/10", pct:(movie.imdbRating/10)*100, color:"#F5C518", sub: movie.imdbVotes },
    movie.rottenTomatoes && { src:"RT", val:movie.rottenTomatoes.replace("%",""), suffix:"%", pct:parseInt(movie.rottenTomatoes), color: parseInt(movie.rottenTomatoes)>=60 ? C.orange : C.red, sub:"Rotten Tomatoes" },
    movie.metacritic && { src:"MC",   val:movie.metacritic, suffix:"/100", pct:parseInt(movie.metacritic), color: parseInt(movie.metacritic)>=61?C.success:parseInt(movie.metacritic)>=40?C.orange:C.red, sub:"Metacritic" },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
      {items.map((b,i)=>(
        <div key={i} style={{ background:C.bgDeep, border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 16px", minWidth:78, position:"relative", overflow:"hidden" }}>
          {/* subtle fill bar */}
          <div style={{ position:"absolute", bottom:0, left:0, height:3, width:`${Math.min(b.pct,100)}%`, background:b.color, borderRadius:"0 2px 2px 0", opacity:0.5 }}/>
          <p style={{ fontSize:10, color:C.textDim, marginBottom:4, fontWeight:500 }}>{b.src}</p>
          <p style={{ fontSize:20, fontWeight:700, color:b.color, fontFamily:"'Cinzel',serif", lineHeight:1 }}>
            {b.val}<span style={{ fontSize:11, fontWeight:400, opacity:0.7 }}>{b.suffix}</span>
          </p>
          {b.sub&&<p style={{ fontSize:9, color:C.textDim, marginTop:3 }}>{b.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  MOVIE CARD
// ─────────────────────────────────────────────
function MovieCard({ movie, size="md", onClick }) {
  const w = size==="sm"?100:size==="lg"?170:130;
  const h = Math.round(w*1.5);
  return (
    <div className="card-hover" onClick={onClick} style={{ width:w, flexShrink:0, cursor:"pointer", display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ width:w, height:h, borderRadius:8, background:C.bgCard, border:`1px solid ${C.border}`, overflow:"hidden", position:"relative" }}>
        {movie.poster
          ? <img src={movie.poster} alt={movie.title} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"}/>
          : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:6, padding:8 }}>
              <span style={{ fontSize:24, opacity:0.4 }}>🎬</span>
              <p style={{ fontSize:10, color:C.textDim, textAlign:"center", lineHeight:1.3 }}>{movie.title}</p>
            </div>
        }
        {movie.rating&&(
          <div style={{ position:"absolute", bottom:6, left:6, background:"rgba(9,21,35,0.88)", color:C.gold, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4 }}>
            ★ {movie.rating}
          </div>
        )}
      </div>
      {size!=="sm"&&(
        <div>
          <p style={{ fontSize:12, fontWeight:500, color:C.text, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:w }}>{movie.title}</p>
          <p style={{ fontSize:11, color:C.textMuted }}>{movie.year}</p>
        </div>
      )}
    </div>
  );
}

// Mini poster for clubs (fetches from TMDb)
function MiniPoster({ tmdbId }) {
  const [poster, setPoster] = useState(null);
  useEffect(() => {
    if (!tmdbId) return;
    cachedFetch(`mini_${tmdbId}`, ()=>
      tmdbProxy({ data: { path: `/movie/${tmdbId}`, params: {} } })
    ).then(d=>{ if(d?.poster_path) setPoster(tmdb.poster(d.poster_path,"w92")); }).catch(()=>{});
  }, [tmdbId]);
  return poster ? <img src={poster} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : null;
}

// ─────────────────────────────────────────────
//  ICONS
// ─────────────────────────────────────────────
const BackIcon   = ()=><svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const PlusIcon   = ()=><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const CheckIcon  = ()=><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const ShareIcon  = ()=><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const SearchSVG  = ({size=16,color=C.textDim})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const KeyIcon    = ()=><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const PlayIcon   = ()=><svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>;
const HeartIcon  = ({f})=><svg width={14} height={14} viewBox="0 0 24 24" fill={f?C.red:"none"} stroke={f?C.red:"currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;

// ─────────────────────────────────────────────
//  NAVBAR
// ─────────────────────────────────────────────
function Navbar({ page, setPage, hasKeys, apiStatus }) {
  const items = [["home","Discover"],["profile","Perfil"],["groups","Clubs"],["search","Buscar"]];
  const statusDot = (ok) => (
    <span style={{ width:6, height:6, borderRadius:"50%", background: ok ? C.success : C.red, display:"inline-block", flexShrink:0 }}/>
  );
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(9,21,35,0.93)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", height:60 }}>
      <button onClick={()=>setPage("home")} style={{ display:"flex", alignItems:"center", gap:9 }}>
        <div style={{ width:32, height:32, borderRadius:"50%", border:`1.5px solid ${C.gold}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:15 }}>🎬</span>
        </div>
        <span style={{ fontFamily:"'Cinzel',serif", fontSize:17, fontWeight:700, color:C.gold, letterSpacing:"0.08em" }}>MovieClub</span>
      </button>
      <div style={{ display:"flex", gap:2 }}>
        {items.map(([id,label])=>(
          <button key={id} onClick={()=>setPage(id)} style={{ padding:"6px 16px", borderRadius:8, fontSize:13, fontWeight:500, color:page===id?C.gold:C.textMuted, background:page===id?"rgba(201,168,76,0.10)":"transparent", transition:"all 0.2s" }}>{label}</button>
        ))}
      </div>
      <button onClick={()=>setPage("settings")} style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 14px", borderRadius:8, background: hasKeys ? "transparent" : "rgba(239,68,68,0.08)", border:`1px solid ${hasKeys ? C.border : "rgba(239,68,68,0.35)"}`, color:hasKeys?C.textMuted:C.red, fontSize:12, transition:"all 0.2s" }}
        onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.gold; e.currentTarget.style.color=C.text; }}
        onMouseLeave={e=>{ e.currentTarget.style.borderColor=hasKeys?C.border:"rgba(239,68,68,0.35)"; e.currentTarget.style.color=hasKeys?C.textMuted:C.red; }}>
        <KeyIcon/>
        <span>{hasKeys ? "APIs" : "⚠ Configurar APIs"}</span>
        {hasKeys && (
          <div style={{ display:"flex", gap:3, alignItems:"center", marginLeft:2 }}>
            {statusDot(apiStatus?.tmdb)} {statusDot(apiStatus?.omdb)} {statusDot(apiStatus?.streaming)}
          </div>
        )}
      </button>
    </nav>
  );
}

// ─────────────────────────────────────────────
//  SETTINGS PAGE (server-side keys)
// ─────────────────────────────────────────────
function SettingsPage({ apiStatus }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});

  const testApis = async () => {
    setTesting(true); setResults({});
    try {
      const tmdbRes = await tmdb.popular();
      setResults(r => ({...r, tmdb: { ok: !!tmdbRes?.results, msg: tmdbRes?.results ? `✓ TMDb respondeu com ${tmdbRes.results.length} filmes` : "✗ Falha na resposta" }}));
    } catch(e) { setResults(r => ({...r, tmdb: { ok: false, msg: `✗ Erro: ${e.message}` }})); }
    try {
      const omdbRes = await omdb.byTitle("Inception", 2010);
      setResults(r => ({...r, omdb: { ok: !!omdbRes?.Title, msg: omdbRes?.Title ? `✓ OMDb: "${omdbRes.Title}" (${omdbRes.Year})` : "✗ Sem resposta (chave pode não estar configurada)" }}));
    } catch(e) { setResults(r => ({...r, omdb: { ok: false, msg: `✗ Erro: ${e.message}` }})); }
    setTesting(false);
  };

  const APIS = [
    { key:"tmdb", label:"TMDb API", color:"#01B4E4", desc:"Pôsteres, metadados, elenco, trailers, busca e recomendações.", secret:"TMDB_API_KEY" },
    { key:"omdb", label:"OMDb API", color:"#F5C518", desc:"Ratings IMDb, Rotten Tomatoes, Metacritic, bilheteria e prêmios.", secret:"OMDB_API_KEY" },
    { key:"streaming", label:"Streaming Availability", color:"#0055DA", desc:"Onde assistir no Brasil — Netflix, Prime, Disney+, Max e mais.", secret:"STREAMING_AVAILABILITY_API_KEY" },
  ];

  return (
    <div style={{ paddingTop:80, paddingBottom:80 }}>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"0 28px" }}>
        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:26, fontWeight:700, color:C.text, marginBottom:8 }}>
            Status das <span style={{ color:C.gold }}>APIs</span>
          </h1>
          <p style={{ color:C.textMuted, fontSize:14, lineHeight:1.7 }}>
            As chaves de API estão configuradas de forma segura no <strong style={{ color:C.text }}>servidor</strong>. Elas nunca são expostas ao navegador.
          </p>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:28, padding:16, borderRadius:14, background:C.bgCard, border:`1px solid ${C.border}` }}>
          {APIS.map(api => {
            const result = results[api.key];
            const status = result?.ok ? "ok" : result?.ok === false ? "error" : "configured";
            const colors = { ok: C.success, error: C.red, configured: C.gold };
            const labels = { ok: "Ativa", error: "Erro", configured: "Configurada" };
            return (
              <div key={api.key} style={{ flex:1, textAlign:"center", padding:"10px 8px", borderRadius:10, background:C.bgDeep, border:`1px solid ${status==="ok"?C.success:status==="error"?C.red:C.border}`, transition:"border-color 0.3s" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:colors[status], margin:"0 auto 6px" }}/>
                <p style={{ fontSize:11, fontWeight:600, color:colors[status] }}>{api.label.split(" ")[0]}</p>
                <p style={{ fontSize:10, color:C.textDim }}>{labels[status]}</p>
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {APIS.map(api => {
            const result = results[api.key];
            return (
              <div key={api.key} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:api.color, flexShrink:0 }}/>
                  <h3 style={{ fontSize:15, fontWeight:600, color:C.text }}>{api.label}</h3>
                  <Badge color="rgba(34,197,94,0.1)" textColor={C.success} small>Servidor</Badge>
                </div>
                <p style={{ fontSize:13, color:C.textMuted, marginBottom:10, lineHeight:1.6, paddingLeft:20 }}>{api.desc}</p>
                <p style={{ fontSize:11, color:C.textDim, paddingLeft:20, fontFamily:"monospace" }}>Secret: {api.secret}</p>
                {result && (
                  <p style={{ marginTop:10, fontSize:12, fontWeight:500, color:result.ok?C.success:C.red, padding:"7px 12px", borderRadius:8, background:result.ok?"rgba(34,197,94,0.07)":"rgba(239,68,68,0.07)", border:`1px solid ${result.ok?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}` }}>
                    {result.msg}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:28 }}>
          <Btn variant="gold" onClick={testApis}>{testing?<><Spinner size={14}/> Testando…</>:<><CheckIcon/> Testar APIs</>}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PAGINATION HOOK & COMPONENT
// ─────────────────────────────────────────────
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

function PaginationBar({ page, totalPages, totalResults, onPageChange }) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 2);
      let end = Math.min(totalPages - 1, page + 2);
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
    border: `1px solid ${active ? C.gold : C.border}`, cursor: "pointer", transition: "all 0.2s",
    minWidth: 36, textAlign: "center",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 24 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          style={{ ...btnStyle(false), opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? "default" : "pointer" }}>
          ← Anterior
        </button>
        {getVisiblePages().map((p, i) =>
          p === "..." ? <span key={`e${i}`} style={{ color: C.textDim, fontSize: 12, padding: "0 4px" }}>…</span>
            : <button key={p} onClick={() => onPageChange(p)} style={btnStyle(p === page)}>{p}</button>
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          style={{ ...btnStyle(false), opacity: page >= totalPages ? 0.3 : 1, cursor: page >= totalPages ? "default" : "pointer" }}>
          Próxima →
        </button>
      </div>
      <span style={{ fontSize: 11, color: C.textDim }}>
        Página {page.toLocaleString("pt-BR")} de {totalPages.toLocaleString("pt-BR")} — {totalResults.toLocaleString("pt-BR")} filmes no total
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
//  HOME PAGE
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

  // Genre section
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

  useEffect(() => { tmdb.genres().then(g => setGenres(g.genres || [])).catch(() => {}); }, []);
  useEffect(() => { if (activeG) loadGenre(activeG.id, 1); }, [activeG, loadGenre]);

  const go = m => { setSelectedMovie(m); setPage("movie"); };
  const hero = trend.movies[0];
  const initialLoading = trend.loading && trend.movies.length === 0;

  return (
    <div style={{ paddingTop: 60, paddingBottom: 60 }}>
      {hero ? (
        <div style={{ height: 400, position: "relative", overflow: "hidden", marginBottom: 48 }}>
          {hero.backdrop && <img src={hero.backdrop} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${C.bg} 0%, rgba(13,27,42,0.65) 55%, rgba(13,27,42,0.25) 100%)` }} />
          <div style={{ position: "absolute", bottom: 44, left: 48, maxWidth: 540, zIndex: 1 }}>
            <Badge color="rgba(201,168,76,0.15)" textColor={C.gold}>✦ Em Alta Esta Semana</Badge>
            <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: 38, fontWeight: 900, color: C.text, marginTop: 12, marginBottom: 8, lineHeight: 1.15 }}>{hero.title}</h1>
            {hero.tagline && <p style={{ color: C.gold, fontSize: 13, fontStyle: "italic", marginBottom: 10 }}>"{hero.tagline}"</p>}
            <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 20, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{hero.overview}</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Btn variant="gold" onClick={() => go(hero)}><PlayIcon /> Ver Detalhes</Btn>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(9,21,35,0.6)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                <StarRating value={Math.round((hero.rating || 0) / 2)} size={14} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{hero.rating}/10</span>
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", right: 32, bottom: 32, display: "flex", gap: 10, alignItems: "flex-end" }}>
            {trend.movies.slice(1, 5).map((m, i) => (
              <div key={m.id} onClick={() => go(m)} style={{ width: 68, cursor: "pointer", transform: `translateY(${i * 10}px)`, opacity: 0.7 + i * 0.07 }}>
                <div style={{ height: 102, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  {m.poster && <img src={m.poster} alt={m.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        initialLoading && <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} /></div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <Section title="Em Alta Agora" action={{ label: "Buscar", onClick: () => setPage("search") }}>
          {trend.loading
            ? <div style={{ display: "flex", gap: 14 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
                {trend.movies.map(m => <MovieCard key={m.id} movie={m} onClick={() => go(m)} />)}
              </div>
          }
          <PaginationBar page={trend.page} totalPages={trend.totalPages} totalResults={trend.totalResults} onPageChange={trend.goTo} />
        </Section>

        {genres.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontFamily: "'Cinzel',serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>Explorar por Gênero</h3>
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
                ? <div style={{ display: "flex", gap: 14 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
                : <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
                      {genreMovs.map(m => <MovieCard key={m.id} movie={m} onClick={() => go(m)} />)}
                    </div>
                    <PaginationBar page={genrePage} totalPages={genreTotalPages} totalResults={genreTotalResults}
                      onPageChange={(p) => loadGenre(activeG.id, p)} />
                  </>
            )}
          </div>
        )}

        <Section title="Mais Populares">
          {pop.loading
            ? <div style={{ display: "flex", gap: 14 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
                {pop.movies.map(m => <MovieCard key={m.id} movie={m} onClick={() => go(m)} />)}
              </div>
          }
          <PaginationBar page={pop.page} totalPages={pop.totalPages} totalResults={pop.totalResults} onPageChange={pop.goTo} />
        </Section>

        <Section title="Melhor Avaliados pelo TMDb">
          {top.loading
            ? <div style={{ display: "flex", gap: 14 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
                {top.movies.map(m => <MovieCard key={m.id} movie={m} onClick={() => go(m)} />)}
              </div>
          }
          <PaginationBar page={top.page} totalPages={top.totalPages} totalResults={top.totalResults} onPageChange={top.goTo} />
        </Section>
      </div>
      <FilmStripBg />
    </div>
  );
}

// ─────────────────────────────────────────────
//  MOVIE DETAIL PAGE  (TMDb + OMDb + Streaming)
// ─────────────────────────────────────────────
function MoviePage({ movieInit, setPage, setSelectedMovie }) {
  const { movie, loading, streamServices } = useMovieDetails(movieInit?.tmdbId||movieInit?.id);
  const m = movie || movieInit;
  const [watched, setWatched] = useState(false);
  const [liked,   setLiked]   = useState(false);
  const [rating,  setRating]  = useState(0);
  const [review,  setReview]  = useState("");

  if (loading&&!m) return (
    <div style={{ paddingTop:80, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}><Spinner size={38}/><p style={{ color:C.textMuted, marginTop:12, fontSize:13 }}>Carregando via TMDb…</p></div>
    </div>
  );
  if (!m) return null;

  const reviews = MOCK_REVIEWS.filter(r=>r.movieTmdbId===m.tmdbId).map(r=>({...r,user:MOCK_USERS.find(u=>u.id===r.userId)}));

  return (
    <div style={{ paddingTop:60, paddingBottom:60, minHeight:"100vh" }}>
      {/* Backdrop */}
      <div style={{ height:380, position:"relative", overflow:"hidden" }}>
        {m.backdrop
          ?<img src={m.backdrop} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.38 }}/>
          :<div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg,#0a1e34,#1a2d48)` }}/>
        }
        <div style={{ position:"absolute", inset:0, background:`linear-gradient(to bottom, transparent 30%, ${C.bg} 100%)` }}/>
        <button onClick={()=>setPage("home")} style={{ position:"absolute", top:20, left:28, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, background:"rgba(9,21,35,0.7)", color:C.textMuted, border:`1px solid ${C.border}`, fontSize:13, zIndex:1 }}>
          <BackIcon/> Voltar
        </button>
      </div>

      <div style={{ maxWidth:1100, margin:"-180px auto 0", padding:"0 32px", position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", gap:32, marginBottom:40, alignItems:"flex-end" }}>
          {/* Poster */}
          <div style={{ width:180, height:270, borderRadius:14, flexShrink:0, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.6)", border:`2px solid ${C.border}`, background:C.bgCard }}>
            {m.poster&&<img src={m.posterHD||m.poster} alt={m.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"}/>}
          </div>

          <div style={{ flex:1, paddingBottom:6 }}>
            {/* Badges */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              {(m.genres?.length?m.genres:[m.genre]).slice(0,4).map(g=><Badge key={g} color="rgba(201,168,76,0.10)" textColor={C.goldDim}>{g}</Badge>)}
              {m.rated&&<Badge color={C.bgCard} textColor={C.textDim}>{m.rated}</Badge>}
              {m.year&&<Badge color={C.bgCard} textColor={C.textDim}>{m.year}</Badge>}
              {m.runtime&&<Badge color={C.bgCard} textColor={C.textDim}>{m.runtime} min</Badge>}
            </div>

            <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:34, fontWeight:900, color:C.text, marginBottom:4, lineHeight:1.15 }}>{m.title}</h1>
            {m.tagline&&<p style={{ color:C.gold, fontSize:13, fontStyle:"italic", marginBottom:14 }}>"{m.tagline}"</p>}

            <div style={{ display:"flex", gap:20, marginBottom:14, flexWrap:"wrap" }}>
              {m.director&&<div><span style={{ fontSize:10, color:C.textDim, display:"block" }}>Direção</span><span style={{ fontSize:13, color:C.textMuted }}>{m.director}</span></div>}
              {m.writer&&<div><span style={{ fontSize:10, color:C.textDim, display:"block" }}>Roteiro</span><span style={{ fontSize:13, color:C.textMuted }}>{m.writer.split(",")[0]}</span></div>}
            </div>

            {/* ★ Multi-source ratings (TMDb + IMDb/OMDb + RT + MC) */}
            <div style={{ marginBottom:16 }}>
              {loading&&!m.imdbRating
                ?<div style={{ display:"flex", gap:8 }}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{ width:72, height:62, borderRadius:10 }}/>)}</div>
                :<RatingsRow movie={m}/>
              }
            </div>

            {/* 📺 Streaming Availability */}
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:10, color:C.textDim, marginBottom:7, textTransform:"uppercase", letterSpacing:"0.08em" }}>Onde Assistir no Brasil</p>
              <StreamingBadges services={streamServices} loading={loading&&!streamServices.length}/>
            </div>

            {/* Awards & Box Office from OMDb */}
            {(m.awards||m.boxOffice)&&(
              <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
                {m.awards&&(
                  <div style={{ background:"rgba(201,168,76,0.06)", border:`1px solid rgba(201,168,76,0.2)`, borderRadius:8, padding:"6px 12px" }}>
                    <p style={{ fontSize:10, color:C.goldDim, marginBottom:2 }}>Prêmios</p>
                    <p style={{ fontSize:12, color:C.gold }}>{m.awards}</p>
                  </div>
                )}
                {m.boxOffice&&(
                  <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px" }}>
                    <p style={{ fontSize:10, color:C.textDim, marginBottom:2 }}>Bilheteria Mundial</p>
                    <p style={{ fontSize:12, color:C.text }}>{m.boxOffice}</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <Btn variant={watched?"ghost":"gold"} onClick={()=>setWatched(w=>!w)}>
                {watched?<><CheckIcon/> Assistido</>:<><PlusIcon/> Marcar Assistido</>}
              </Btn>
              <Btn variant="ghost" onClick={()=>setLiked(l=>!l)}><HeartIcon f={liked}/> Curtir</Btn>
              {m.trailer&&(
                <a href={`https://youtube.com/watch?v=${m.trailer}`} target="_blank" rel="noopener noreferrer">
                  <Btn variant="ghost"><PlayIcon/> Trailer</Btn>
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:28 }}>
          <div>
            <Section title="Sinopse">
              <p style={{ color:C.textMuted, fontSize:14, lineHeight:1.8 }}>{m.plot||m.overview}</p>
            </Section>

            {m.cast?.length>0&&(
              <Section title="Elenco Principal">
                <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:8 }}>
                  {m.cast.map(actor=>(
                    <div key={actor.id} style={{ textAlign:"center", flexShrink:0, width:78 }}>
                      <div style={{ width:66, height:66, borderRadius:"50%", overflow:"hidden", margin:"0 auto 6px", background:C.bgCard, border:`2px solid ${C.border}` }}>
                        {actor.photo?<img src={actor.photo} alt={actor.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"}/>:<div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, opacity:0.4 }}>👤</div>}
                      </div>
                      <p style={{ fontSize:11, fontWeight:500, color:C.text, lineHeight:1.2 }}>{actor.name}</p>
                      <p style={{ fontSize:10, color:C.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:78 }}>{actor.character}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Reviews da Comunidade">
              {watched&&(
                <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
                  <p style={{ fontSize:13, color:C.textMuted, marginBottom:10 }}>Sua avaliação</p>
                  <StarRating value={rating} max={5} size={22} interactive onChange={setRating}/>
                  <textarea value={review} onChange={e=>setReview(e.target.value)} placeholder="Escreva sua review…" rows={3}
                    style={{ width:"100%", marginTop:12, padding:"10px 14px", borderRadius:8, background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text, fontSize:13, resize:"vertical", outline:"none" }}/>
                  <Btn variant="gold" style={{ marginTop:10 }} size="sm">Publicar</Btn>
                </div>
              )}
              {reviews.map((r,i)=>(
                <div key={i} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Avatar user={r.user} size={34}/>
                      <div>
                        <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{r.user?.name}</p>
                        <p style={{ fontSize:11, color:C.textDim }}>{r.date}</p>
                      </div>
                    </div>
                    <StarRating value={r.rating} size={12}/>
                  </div>
                  <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.6 }}>{r.text}</p>
                </div>
              ))}
              {!reviews.length&&<p style={{ color:C.textDim, fontSize:13, padding:"20px 0" }}>Seja o primeiro a avaliar.</p>}
            </Section>

            {/* Recommendations from TMDb */}
            {(m.recommendations?.length>0||m.similar?.length>0)&&(
              <Section title="Recomendados pelo TMDb">
                <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:8 }}>
                  {(m.recommendations?.length?m.recommendations:m.similar).map(mv=>(
                    <MovieCard key={mv.id} movie={mv} onClick={()=>{ setSelectedMovie(mv); setPage("movie"); }}/>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:20, marginBottom:14 }}>
              <p style={{ fontSize:10, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Detalhes</p>
              {[
                ["Título original", m.originalTitle],
                ["Idioma", m.language],
                ["País", m.country],
                ["Lançamento", m.releaseDate],
                ["Duração", m.runtime?`${m.runtime} min`:null],
                ["Status", m.status],
                ["Orçamento", m.budget>0?`$${(m.budget/1e6).toFixed(1)}M`:null],
                ["Receita", m.revenue>0?`$${(m.revenue/1e6).toFixed(1)}M`:null],
              ].filter(([,v])=>v).map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:12, color:C.textDim }}>{k}</span>
                  <span style={{ fontSize:12, color:C.textMuted, textAlign:"right", maxWidth:160 }}>{v}</span>
                </div>
              ))}
              {m.imdbId&&(
                <div style={{ marginTop:10 }}>
                  <a href={`https://imdb.com/title/${m.imdbId}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:12, color:"#F5C518", display:"flex", alignItems:"center", gap:4 }}>
                    Ver no IMDb ↗
                  </a>
                </div>
              )}
            </div>

            <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
              <p style={{ fontSize:10, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Adicionar ao Club</p>
              {MOCK_GROUPS.map(g=>(
                <button key={g.id} style={{ width:"100%", padding:"9px 14px", borderRadius:8, textAlign:"left", background:C.bgDeep, border:`1px solid ${C.border}`, color:C.textMuted, fontSize:13, marginBottom:8, transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"space-between" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.gold; e.currentTarget.style.color=C.text; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.textMuted; }}>
                  <span>{g.name}</span><PlusIcon/>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SEARCH PAGE
// ─────────────────────────────────────────────
function SearchPage({ setPage, setSelectedMovie }) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [genres,   setGenres]   = useState([]);
  const [activeG,  setActiveG]  = useState(null);
  const [total,    setTotal]    = useState(0);
  const [page,     setSearchPg] = useState(1);
  const [loading,  setLoading]  = useState(false);
  const debRef = useRef(null);

  useEffect(()=>{ tmdb.genres().then(d=>setGenres(d.genres||[])).catch(()=>{}); },[]);

  useEffect(()=>{
    clearTimeout(debRef.current);
    if (!query.trim()) { setResults([]); setTotal(0); return; }
    debRef.current = setTimeout(async ()=>{
      setLoading(true); setSearchPg(1);
      const d = await tmdb.search(query,1).catch(()=>({results:[],total_results:0}));
      setResults((d.results||[]).map(normalizeTmdb).filter(Boolean));
      setTotal(d.total_results||0);
      setLoading(false);
    },360);
  },[query]);

  useEffect(()=>{
    if (!activeG) return;
    setLoading(true);
    tmdb.byGenre(activeG.id,page).then(d=>{
      setResults(prev=> page===1?(d.results||[]).map(normalizeTmdb).filter(Boolean):[...prev,...(d.results||[]).map(normalizeTmdb).filter(Boolean)]);
      setTotal(d.total_results||0);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[activeG,page]);

  return (
    <div style={{ paddingTop:80, paddingBottom:60 }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 32px" }}>
        <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:26, fontWeight:700, color:C.text, marginBottom:24 }}>
          Buscar <span style={{ color:C.gold }}>Filmes</span>
        </h1>
        <div style={{ position:"relative", marginBottom:20 }}>
          <div style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}><SearchSVG size={18}/></div>
          <input value={query} onChange={e=>{ setQuery(e.target.value); setActiveG(null); }}
            placeholder="Buscar por título, ator, ano…"
            style={{ width:"100%", paddingLeft:48, paddingRight:20, paddingTop:14, paddingBottom:14, borderRadius:12, background:C.bgCard, border:`1px solid ${C.border}`, color:C.text, fontSize:15, outline:"none", transition:"border-color 0.2s" }}
            onFocus={e=>e.target.style.borderColor=C.gold} onBlur={e=>e.target.style.borderColor=C.border}/>
          {loading&&<div style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)" }}><Spinner size={18}/></div>}
        </div>

        {!query&&(
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:24 }}>
            {genres.slice(0,14).map(g=>(
              <button key={g.id} onClick={()=>{ setActiveG(activeG?.id===g.id?null:g); setSearchPg(1); }}
                style={{ padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:500, whiteSpace:"nowrap", transition:"all 0.2s", background:activeG?.id===g.id?C.gold:C.bgCard, color:activeG?.id===g.id?C.bgDeep:C.textMuted, border:`1px solid ${activeG?.id===g.id?C.gold:C.border}` }}>
                {g.name}
              </button>
            ))}
          </div>
        )}

        {total>0&&(
          <p style={{ color:C.textDim, fontSize:13, marginBottom:20 }}>
            {total.toLocaleString()} resultado{total!==1?"s":""}{(query||activeG)&&<span style={{ color:C.gold }}> · "{query||activeG?.name}"</span>}
          </p>
        )}

        {results.length>0?(
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:14 }}>
              {results.map(m=><MovieCard key={m.id} movie={m} onClick={()=>{ setSelectedMovie(m); setPage("movie"); }}/>)}
            </div>
            {!query&&activeG&&results.length<total&&(
              <div style={{ textAlign:"center", marginTop:28 }}>
                <Btn variant="ghost" onClick={()=>setSearchPg(p=>p+1)}>{loading?<Spinner size={14}/>:"Carregar mais"}</Btn>
              </div>
            )}
          </>
        ):(
          !loading&&(query||activeG)&&(
            <div style={{ textAlign:"center", padding:"60px 0", color:C.textDim }}>
              <p style={{ fontSize:32, marginBottom:12 }}>🔍</p>
              <p style={{ fontSize:15 }}>Nenhum resultado para "{query||activeG?.name}"</p>
            </div>
          )
        )}

        {!query&&!activeG&&!loading&&(
          <div style={{ textAlign:"center", padding:"60px 0", color:C.textDim }}>
            <p style={{ fontSize:40, marginBottom:12 }}>🎬</p>
            <p style={{ fontSize:15 }}>Digite um título ou selecione um gênero</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PROFILE PAGE
// ─────────────────────────────────────────────
function ProfilePage({ user, setPage, isOwnProfile=true }) {
  const u = user||MOCK_USERS[3];
  const [tab, setTab] = useState("reviews");
  const reviews = MOCK_REVIEWS.filter(r=>r.userId===u.id).map(r=>({...r,user:u}));
  return (
    <div style={{ paddingTop:80, paddingBottom:60 }}>
      <div style={{ maxWidth:960, margin:"0 auto", padding:"0 32px" }}>
        <div style={{ height:170, borderRadius:"16px 16px 0 0", background:`linear-gradient(135deg,#0a1e34,#1a2d48)`, border:`1px solid ${C.border}`, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:`repeating-linear-gradient(45deg,transparent,transparent 30px,rgba(201,168,76,0.03) 30px,rgba(201,168,76,0.03) 31px)` }}/>
          {!isOwnProfile&&<button onClick={()=>setPage("home")} style={{ position:"absolute", top:16, left:16, display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, background:"rgba(9,21,35,0.6)", color:C.textMuted, border:`1px solid ${C.border}`, fontSize:13 }}><BackIcon/> Voltar</button>}
        </div>
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 16px 16px", padding:"0 28px 24px", marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginTop:-36 }}>
              <div style={{ width:86, height:86, borderRadius:"50%", background:u.color, border:`3px solid ${C.bgCard}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:"#fff", fontFamily:"'Cinzel',serif" }}>{u.initials}</div>
              <div style={{ paddingBottom:4 }}>
                <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:21, fontWeight:700, color:C.text }}>{u.name}</h1>
                <p style={{ color:C.textMuted, fontSize:13 }}>@{u.username}</p>
              </div>
            </div>
            {isOwnProfile?<Btn variant="ghost" style={{ marginBottom:4 }}>Editar Perfil</Btn>:<Btn variant="gold" style={{ marginBottom:4 }}><PlusIcon/> Seguir</Btn>}
          </div>
          <div style={{ display:"flex", gap:28 }}>
            {[["Reviews",u.reviews],["Amigos",u.friends],["Clubs",MOCK_GROUPS.filter(g=>g.members.includes(u.id)).length]].map(([l,v])=>(
              <div key={l}><p style={{ fontSize:21, fontWeight:700, color:C.gold, fontFamily:"'Cinzel',serif" }}>{v}</p><p style={{ fontSize:12, color:C.textMuted }}>{l}</p></div>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:28 }}>
          {[["reviews","Reviews"],["friends","Amigos"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ padding:"10px 22px", fontSize:13, fontWeight:500, color:tab===id?C.gold:C.textMuted, borderBottom:`2px solid ${tab===id?C.gold:"transparent"}`, transition:"all 0.2s", marginBottom:-1 }}>{label}</button>
          ))}
        </div>
        {tab==="reviews"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {reviews.length>0?reviews.map((r,i)=>(
              <div key={i} style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:C.gold }}>TMDb #{r.movieTmdbId}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}><StarRating value={r.rating} size={13}/><span style={{ fontSize:11, color:C.textDim }}>{r.date}</span></div>
                </div>
                <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.6 }}>"{r.text}"</p>
              </div>
            )):<p style={{ color:C.textDim, textAlign:"center", padding:40 }}>Nenhuma review ainda.</p>}
          </div>
        )}
        {tab==="friends"&&(
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:14 }}>
            {MOCK_USERS.filter(u2=>u2.id!==u.id).map(friend=>(
              <div key={friend.id} className="card-hover" onClick={()=>setPage("friend")}
                style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:20, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                <Avatar user={friend} size={54}/><div style={{ textAlign:"center" }}>
                  <p style={{ fontSize:14, fontWeight:600, color:C.text }}>{friend.name}</p>
                  <p style={{ fontSize:12, color:C.textMuted }}>@{friend.username}</p>
                </div>
                <div style={{ display:"flex", gap:20 }}>
                  {[["reviews",friend.reviews],["amigos",friend.friends]].map(([l,v])=>(
                    <div key={l} style={{ textAlign:"center" }}><p style={{ fontSize:14, fontWeight:600, color:C.gold }}>{v}</p><p style={{ fontSize:11, color:C.textDim }}>{l}</p></div>
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
    <div style={{ paddingTop:80, paddingBottom:60 }}>
      <div style={{ maxWidth:960, margin:"0 auto", padding:"0 32px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:30 }}>
          <div>
            <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:26, fontWeight:700, color:C.text, marginBottom:6 }}>Meus <span style={{ color:C.gold }}>Clubs</span></h1>
            <p style={{ color:C.textMuted, fontSize:13 }}>Listas colaborativas com seus amigos</p>
          </div>
          <Btn variant="gold" onClick={()=>setShowCreate(true)}><PlusIcon/> Criar Club</Btn>
        </div>
        {showCreate&&(
          <div style={{ background:C.bgCard, border:`1px solid ${C.gold}`, borderRadius:16, padding:24, marginBottom:22, animation:"fadeIn 0.2s ease" }}>
            <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:15, color:C.text, marginBottom:16 }}>Novo Club</h3>
            <div style={{ display:"flex", gap:12 }}>
              <TextInput label="Nome do Club" value={name} onChange={setName} placeholder="Ex: Cinéphiles de Sexta" style={{ flex:1 }}/>
              <TextInput label="Convidar (username)" value="" onChange={()=>{}} placeholder="@username" style={{ flex:1 }}/>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:14 }}>
              <Btn variant="gold" size="sm">Criar</Btn>
              <Btn variant="ghost" size="sm" onClick={()=>setShowCreate(false)}>Cancelar</Btn>
            </div>
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
          {MOCK_GROUPS.map(group=>{
            const members = MOCK_USERS.filter(u=>group.members.includes(u.id));
            const allIds = [...new Set(Object.values(GROUP_RECS[group.id]||{}).flat())];
            return (
              <div key={group.id} className="card-hover" onClick={()=>{ setSelectedGroup(group); setPage("group"); }}
                style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:16, padding:22, cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                  <div>
                    <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:15, fontWeight:600, color:C.text, marginBottom:4 }}>{group.name}</h3>
                    <p style={{ fontSize:12, color:C.textDim }}>{members.length} membros · {allIds.length} filmes</p>
                  </div>
                  <div style={{ display:"flex" }}>{members.slice(0,3).map((m,i)=><div key={m.id} style={{ marginLeft:i>0?-8:0, zIndex:3-i }}><Avatar user={m} size={28}/></div>)}</div>
                </div>
                <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                  {allIds.slice(0,5).map(id=>(
                    <div key={id} style={{ width:46, height:68, borderRadius:5, background:C.bgDeep, border:`1px solid ${C.border}`, overflow:"hidden", flexShrink:0 }}>
                      <MiniPoster tmdbId={id}/>
                    </div>
                  ))}
                  {allIds.length>5&&<div style={{ width:46, height:68, borderRadius:5, background:C.accentSoft, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:C.textMuted }}>+{allIds.length-5}</div>}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:C.gold }}>Ver club →</span>
                  <button onClick={e=>e.stopPropagation()} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.textDim, padding:"4px 10px", borderRadius:6, border:`1px solid ${C.border}` }}><ShareIcon/> Convidar</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  GROUP DETAIL PAGE — real TMDb data per member
// ─────────────────────────────────────────────
function GroupPage({ group, setPage, setSelectedMovie }) {
  const g = group||MOCK_GROUPS[0];
  const members = MOCK_USERS.filter(u=>g.members.includes(u.id));
  const recIds = GROUP_RECS[g.id]||{};
  const [movieMap, setMovieMap] = useState({});
  const [loading, setLoading]   = useState(true);
  const [genres,  setGenres]    = useState(["Todos"]);
  const [genreF,  setGenreF]    = useState("Todos");
  const [search,  setSearch]    = useState("");
  const [sort,    setSort]      = useState("default");

  useEffect(()=>{
    const allIds = [...new Set(Object.values(recIds).flat())];
    Promise.all(allIds.map(id=>
      cachedFetch(`detail_${id}`,()=>
        tmdbProxy({ data: { path: `/movie/${id}`, params: {} } })
      ).then(normalizeTmdb).catch(()=>null)
    )).then(movies=>{
      const map={};
      allIds.forEach((id,i)=>{ if(movies[i]) map[id]=movies[i]; });
      setMovieMap(map);
      const gs=["Todos",...new Set(Object.values(map).map(m=>m.genre).filter(Boolean))];
      setGenres(gs);
      setLoading(false);
    });
  },[g.id]);

  return (
    <div style={{ paddingTop:80, paddingBottom:60 }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 32px" }}>
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:20, padding:"26px 28px", marginBottom:26 }}>
          <button onClick={()=>setPage("groups")} style={{ display:"flex", alignItems:"center", gap:6, color:C.textMuted, fontSize:13, marginBottom:14 }}><BackIcon/> Meus Clubs</button>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:24, fontWeight:700, color:C.text, marginBottom:8 }}>{g.name}</h1>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {members.map(m=><div key={m.id} style={{ display:"flex", alignItems:"center", gap:6 }}><Avatar user={m} size={22}/><span style={{ fontSize:12, color:C.textMuted }}>{m.name}</span></div>)}
              </div>
            </div>
            <Btn variant="ghost" size="sm"><ShareIcon/> Convidar</Btn>
          </div>
        </div>

        {/* Filters */}
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 18px", marginBottom:26, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:160 }}>
            <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}><SearchSVG size={13}/></div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar no club…"
              style={{ width:"100%", paddingLeft:30, paddingRight:12, paddingTop:7, paddingBottom:7, borderRadius:8, background:C.bgDeep, border:`1px solid ${C.border}`, color:C.text, fontSize:12, outline:"none" }}/>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {genres.map(g2=>(
              <button key={g2} onClick={()=>setGenreF(g2)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:"nowrap", transition:"all 0.2s", background:genreF===g2?C.gold:C.bgDeep, color:genreF===g2?C.bgDeep:C.textMuted, border:`1px solid ${genreF===g2?C.gold:C.border}` }}>{g2}</button>
            ))}
          </div>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{ padding:"7px 12px", borderRadius:8, fontSize:12, background:C.bgDeep, border:`1px solid ${C.border}`, color:C.textMuted, outline:"none" }}>
            <option value="default">Padrão</option>
            <option value="rating">Melhor nota TMDb</option>
            <option value="year">Mais recente</option>
            <option value="popularity">Popularidade</option>
          </select>
        </div>

        {loading?(
          <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}>
            <div style={{ textAlign:"center" }}><Spinner size={36}/><p style={{ color:C.textMuted, marginTop:12, fontSize:13 }}>Carregando via TMDb…</p></div>
          </div>
        ):(
          <div style={{ display:"flex", flexDirection:"column", gap:40 }}>
            {members.map(member=>{
              const ids = recIds[member.id]||[];
              let movies = ids.map(id=>movieMap[id]).filter(Boolean);
              if (genreF!=="Todos") movies=movies.filter(m=>m.genre===genreF);
              if (search) movies=movies.filter(m=>m.title.toLowerCase().includes(search.toLowerCase()));
              if (sort==="rating") movies=[...movies].sort((a,b)=>(b.rating||0)-(a.rating||0));
              if (sort==="year") movies=[...movies].sort((a,b)=>(b.year||0)-(a.year||0));
              if (sort==="popularity") movies=[...movies].sort((a,b)=>(b.popularity||0)-(a.popularity||0));
              if (!movies.length) return null;
              return (
                <div key={member.id}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
                    <Avatar user={member} size={46}/>
                    <div>
                      <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:15, fontWeight:600, color:C.text, marginBottom:2 }}>{member.name}</h3>
                      <p style={{ fontSize:12, color:C.textMuted }}>@{member.username} · {movies.length} recomendaç{movies.length===1?"ão":"ões"}</p>
                    </div>
                    <div style={{ marginLeft:"auto" }}>
                      <Badge color="rgba(201,168,76,0.08)" textColor={C.goldDim}>{movies.length} filmes</Badge>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:14 }}>
                    {movies.map(mv=><MovieCard key={mv.id} movie={mv} onClick={()=>{ setSelectedMovie(mv); setPage("movie"); }}/>)}
                  </div>
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
//  LOGIN
// ─────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail]=useState(""), [pass, setPass]=useState(""), [name, setName]=useState(""), [username, setUsername]=useState("");
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 60% 60% at 20% 20%, rgba(37,99,235,0.1) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(201,168,76,0.07) 0%, transparent 60%)`, pointerEvents:"none" }}/>
      <div style={{ width:420, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:20, padding:"42px 36px", position:"relative", zIndex:1, boxShadow:"0 32px 64px rgba(0,0,0,0.4)", animation:"fadeIn 0.4s ease" }}>
        <div style={{ textAlign:"center", marginBottom:26 }}>
          <div style={{ fontSize:34, marginBottom:8 }}>🎬</div>
          <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:25, fontWeight:700, color:C.gold, letterSpacing:"0.08em", marginBottom:6 }}>MovieClub</h1>
          <p style={{ color:C.textMuted, fontSize:13 }}>{mode==="login"?"Bem-vindo de volta":"Crie sua conta"}</p>
        </div>
        <div style={{ display:"flex", marginBottom:22, background:C.bgDeep, borderRadius:10, padding:3 }}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:"8px", borderRadius:8, fontSize:13, fontWeight:500, background:mode===m?C.bgCard:"transparent", color:mode===m?C.text:C.textMuted, border:mode===m?`1px solid ${C.border}`:"1px solid transparent", transition:"all 0.2s" }}>
              {m==="login"?"Entrar":"Cadastrar"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          {mode==="signup"&&<><TextInput label="Nome" value={name} onChange={setName} placeholder="Seu nome"/><TextInput label="Username" value={username} onChange={setUsername} placeholder="@username"/></>}
          <TextInput label="Email" value={email} onChange={setEmail} placeholder="voce@email.com" type="email"/>
          <TextInput label="Senha" value={pass} onChange={setPass} placeholder="••••••••" type="password"/>
        </div>
        <button onClick={onLogin} style={{ width:"100%", marginTop:20, padding:"12px", background:`linear-gradient(135deg,${C.goldDim},${C.gold})`, color:C.bgDeep, borderRadius:10, fontSize:14, fontWeight:600, fontFamily:"'Cinzel',serif", letterSpacing:"0.05em", transition:"opacity 0.2s, transform 0.15s" }}
          onMouseEnter={e=>{e.target.style.opacity="0.9";e.target.style.transform="translateY(-1px)";}}
          onMouseLeave={e=>{e.target.style.opacity="1";e.target.style.transform="";}}>
          {mode==="login"?"Entrar":"Criar Conta"}
        </button>
        <div style={{ marginTop:18, textAlign:"center" }}>
          <p style={{ color:C.textDim, fontSize:11, marginBottom:10 }}>ou continue com</p>
          <div style={{ display:"flex", gap:8 }}>
            {["Google","Apple"].map(p=>(
              <button key={p} onClick={onLogin} style={{ flex:1, padding:"9px", borderRadius:8, fontSize:12, fontWeight:500, background:C.bgDeep, color:C.textMuted, border:`1px solid ${C.border}`, transition:"all 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderHover;e.currentTarget.style.color=C.text;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMuted;}}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <FilmStripBg/>
    </div>
  );
}

// ─────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────
export default function MovieClubApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage]         = useState("home");
  const [selectedMovie, setSM]  = useState(null);
  const [selectedGroup, setSG]  = useState(null);
  const [apiStatus, setApiStatus] = useState({ tmdb: false, omdb: false, streaming: false });

  // Probe TMDb on mount to verify server key works
  useEffect(()=>{
    tmdb.popular().then(d=>{ if(d?.results) setApiStatus(s=>({...s,tmdb:true})); }).catch(()=>{});
  },[]);

  if (!loggedIn) return <LoginPage onLogin={()=>setLoggedIn(true)}/>;

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <Navbar page={page} setPage={setPage} hasKeys={true} apiStatus={apiStatus}/>
      <div className="page-enter" key={page}>
        {page==="home"     && <HomePage     setPage={setPage} setSelectedMovie={setSM}/>}
        {page==="profile"  && <ProfilePage  user={MOCK_USERS[3]} setPage={setPage} isOwnProfile/>}
        {page==="friend"   && <ProfilePage  user={MOCK_USERS[1]} setPage={setPage} isOwnProfile={false}/>}
        {page==="movie"    && <MoviePage    movieInit={selectedMovie} setPage={setPage} setSelectedMovie={setSM}/>}
        {page==="groups"   && <GroupsPage   setPage={setPage} setSelectedGroup={setSG}/>}
        {page==="group"    && <GroupPage    group={selectedGroup} setPage={setPage} setSelectedMovie={setSM}/>}
        {page==="search"   && <SearchPage   setPage={setPage} setSelectedMovie={setSM}/>}
        {page==="settings" && <SettingsPage apiStatus={apiStatus}/>}
      </div>
    </div>
  );
}
