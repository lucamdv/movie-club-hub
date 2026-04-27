// @ts-nocheck
// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  tmdbProxy,
  omdbProxy,
  streamingProxy,
} from "@/lib/movie-api.functions";
import {
  Film,
  ClipboardList,
  Star,
  User,
  Users,
  Search,
  Handshake,
  Pencil,
  Link2,
  TrendingUp,
  Target,
  Radio,
  Calendar,
  X,
  Flame,
  UserRound,
  Bookmark,
  Clapperboard,
  Eye,
  EyeOff,
  Share2,
  ListVideo,
  Award,
  Zap,
  ChevronLeft,
  ChevronRight,
  Plus,
  SkipForward,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import JSZip from "jszip";
import Papa from "papaparse";
import logoMain from "@/assets/logo-main.png";
import mascotsNav from "@/assets/mascots-nav.png";
import logoText from "@/assets/logo-text.png";
import mascotWizard from "@/assets/mascot-wizard.png";
import mascotSpeak from "@/assets/mascot-speak.png";
import mascotSee from "@/assets/mascot-see.png";
import monkeyDirector from "@/assets/monkey-director.png";
import monkeyPopcorn from "@/assets/monkey-popcorn.png";
import monkeyDetective from "@/assets/monkey-detective.png";
import monkeyStar from "@/assets/monkey-star.png";
import monkeyAstronaut from "@/assets/monkey-astronaut.png";
import monkeyGym from "@/assets/monkey-gym.png";
import monkeyEars from "@/assets/monkey-ears.png";
import monkeyStrong from "@/assets/monkey-strong.png";
import monkeyShy from "@/assets/monkey-shy.png";
import monkeyFlash from "@/assets/monkey-flash.png";
import monkeyCrew from "@/assets/monkey-crew.png";
import monkeySearch from "@/assets/monkey-search.png";
import monkeyGirl from "@/assets/monkey-girl.png";
import monkeyMute from "@/assets/monkey-mute.png";

const MONKEY_AVATARS = [
  { id: "mascot-wizard", src: mascotWizard, label: "Mágico" },
  { id: "mascot-speak", src: mascotSpeak, label: "Falante" },
  { id: "mascot-see", src: mascotSee, label: "Observador" },
  { id: "director", src: monkeyDirector, label: "Diretor" },
  { id: "popcorn", src: monkeyPopcorn, label: "Pipoca" },
  { id: "detective", src: monkeyDetective, label: "Detetive" },
  { id: "star", src: monkeyStar, label: "Estrela" },
  { id: "astronaut", src: monkeyAstronaut, label: "Astronauta" },
  { id: "strong", src: monkeyStrong, label: "Fortão" },
  { id: "shy", src: monkeyShy, label: "Tímido" },
  { id: "gym", src: monkeyGym, label: "Academia" },
  { id: "ears", src: monkeyEars, label: "Surdo" },
  { id: "flash", src: monkeyFlash, label: "Rápido" },
  { id: "crew", src: monkeyCrew, label: "Equipe" },
  { id: "search", src: monkeySearch, label: "Curioso" },
  { id: "girl", src: monkeyGirl, label: "Menina" },
  { id: "mute", src: monkeyMute, label: "Mudo" },
];

// ─────────────────────────────────────────────
//  AVATAR RESOLVER
//  Avatares de macacos são imports com hash do Vite (ex.:
//  /assets/monkey-gym-BxLPn4kV.png). Esses caminhos quebram a cada build,
//  retornando 404. Esta função:
//   1. Resolve tokens estáveis "monkey:<id>" para o import atual.
//   2. Resolve caminhos legados "/assets/<basename>-<hash>.png" pelo basename,
//      mapeando para o import atual.
//   3. Deixa passar URLs http(s) e blobs sem mudança.
// ─────────────────────────────────────────────
const LEGACY_ASSET_MAP = {
  "mascot-wizard": mascotWizard,
  "mascot-speak": mascotSpeak,
  "mascot-see": mascotSee,
  "monkey-director": monkeyDirector,
  "monkey-popcorn": monkeyPopcorn,
  "monkey-detective": monkeyDetective,
  "monkey-star": monkeyStar,
  "monkey-astronaut": monkeyAstronaut,
  "monkey-strong": monkeyStrong,
  "monkey-shy": monkeyShy,
  "monkey-gym": monkeyGym,
  "monkey-ears": monkeyEars,
  "monkey-flash": monkeyFlash,
  "monkey-crew": monkeyCrew,
  "monkey-search": monkeySearch,
  "monkey-girl": monkeyGirl,
  "monkey-mute": monkeyMute,
};

const MONKEY_BY_ID = MONKEY_AVATARS.reduce((acc, m) => {
  acc[m.id] = m.src;
  return acc;
}, {});

function resolveAvatarUrl(url) {
  if (!url || typeof url !== "string") return "";
  // Token estável: monkey:<id>
  if (url.startsWith("monkey:")) {
    const id = url.slice("monkey:".length);
    return MONKEY_BY_ID[id] || "";
  }
  // URL absoluta (Supabase Storage, gravatar, etc.) ou blob/data
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  // Caminho legado de asset com hash: /assets/<basename>-<hash>.<ext>
  const m = url.match(/\/assets\/([a-z0-9-]+?)(?:-[A-Za-z0-9_-]{6,})?\.[a-z0-9]+(?:\?.*)?$/i);
  if (m) {
    const base = m[1];
    if (LEGACY_ASSET_MAP[base]) return LEGACY_ASSET_MAP[base];
  }
  // Caminho relativo qualquer: devolve como está (pode funcionar em dev)
  return url;
}

// ─────────────────────────────────────────────
//  DESIGN TOKENS
// ─────────────────────────────────────────────
const C = {
  bg: "#0F1923",
  bgCard: "#162130",
  bgCardHover: "#1B2838",
  bgDeep: "#091523",
  gold: "#C9A84C",
  goldLight: "#E2C97E",
  goldDim: "#8A6E30",
  text: "#F0EDE6",
  textMuted: "#8A9BB0",
  textDim: "#4A5E72",
  border: "#1E3347",
  borderHover: "#2A4660",
  accent: "#2563EB",
  accentSoft: "#1E3A5F",
  success: "#22C55E",
  red: "#EF4444",
  orange: "#F97316",
  netflix: "#E50914",
  prime: "#00A8E1",
  disney: "#113CCF",
  hbo: "#5822B4",
  apple: "#888888",
  paramount: "#0064FF",
  hulu: "#1CE783",
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
      this.get(path, { ...extraParams, page: String(apiPage2) }).catch(
        () => null,
      ),
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
  poster(path, size = "w300") {
    return path ? `${TMDB_IMG}/${size}${path}` : null;
  },
  backdrop(path, size = "w1280") {
    return path ? `${TMDB_IMG}/${size}${path}` : null;
  },
  async trending(page = 1) {
    return this.getPage("/trending/movie/week", page);
  },
  async popular(page = 1) {
    return this.getPage("/movie/popular", page);
  },
  async topRated(page = 1) {
    return this.getPage("/movie/top_rated", page);
  },
  async details(id) {
    return this.get(`/movie/${id}`, {
      append_to_response: "credits,videos,similar,recommendations",
    });
  },
  async search(q, page = 1) {
    return this.get("/search/movie", { query: q, page: String(page) });
  },
  async genres() {
    return this.get("/genre/movie/list");
  },
  async byGenre(gid, page = 1) {
    return this.getPage("/discover/movie", page, {
      with_genres: String(gid),
      sort_by: "popularity.desc",
    });
  },
  async upcoming(page = 1) {
    return this.getPage("/movie/upcoming", page);
  },
};

const omdb = {
  async get(params) {
    const cacheKey = `omdb:${JSON.stringify(params)}`;
    return cachedFetch(cacheKey, () => omdbProxy({ data: { params } }));
  },
  async byImdbId(id) {
    return this.get({ i: id, plot: "full" });
  },
  async byTitle(title, year) {
    return this.get({
      t: title,
      plot: "short",
      ...(year ? { y: String(year) } : {}),
    });
  },
};

const streaming = {
  async byTmdb(tmdbId, country = "br") {
    const cacheKey = `stream:${tmdbId}:${country}`;
    return cachedFetch(cacheKey, () =>
      streamingProxy({ data: { tmdbId: Number(tmdbId), country } }),
    );
  },
};

// ─────────────────────────────────────────────
//  DATA NORMALIZER
// ─────────────────────────────────────────────
function normalizeTmdb(raw) {
  if (!raw || raw.success === false) return null;
  return {
    id: raw.id,
    tmdbId: raw.id,
    imdbId: raw.imdb_id || null,
    title: raw.title || raw.original_title || "—",
    originalTitle: raw.original_title,
    year: raw.release_date ? +raw.release_date.slice(0, 4) : null,
    releaseDate: raw.release_date,
    overview: raw.overview,
    genre: raw.genres?.[0]?.name || "Outros",
    genres: raw.genres?.map((g) => g.name) || [],
    genreIds: raw.genre_ids || raw.genres?.map((g) => g.id) || [],
    originalLanguage: raw.original_language || null,
    adult: raw.adult === true,
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
    cast:
      raw.credits?.cast?.slice(0, 10).map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        photo: c.profile_path ? `${TMDB_IMG}/w185${c.profile_path}` : null,
      })) || [],
    director:
      raw.credits?.crew?.find((c) => c.job === "Director")?.name || null,
    writers:
      raw.credits?.crew
        ?.filter((c) => c.department === "Writing")
        .slice(0, 2)
        .map((c) => c.name)
        .join(", ") || null,
    trailer:
      raw.videos?.results?.find(
        (v) => v.type === "Trailer" && v.site === "YouTube",
      )?.key || null,
    similar: (raw.similar?.results || [])
      .slice(0, 8)
      .map(normalizeTmdb)
      .filter(Boolean),
    recommendations: (raw.recommendations?.results || [])
      .slice(0, 8)
      .map(normalizeTmdb)
      .filter(Boolean),
  };
}

function mergeOmdb(movie, d) {
  if (!d) return movie;
  return {
    ...movie,
    imdbId: d.imdbID || movie.imdbId,
    imdbRating: d.imdbRating !== "N/A" ? parseFloat(d.imdbRating) : null,
    imdbVotes: d.imdbVotes !== "N/A" ? d.imdbVotes : null,
    rottenTomatoes:
      d.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value || null,
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
  const br =
    raw.streamingOptions?.br ||
    raw.streamingOptions?.us ||
    raw.streamingInfo?.br ||
    raw.streamingInfo?.us ||
    {};
  const opts = Array.isArray(br)
    ? br.reduce((acc, s) => {
        if (!acc[s.service]) acc[s.service] = [];
        acc[s.service].push(s);
        return acc;
      }, {})
    : br;
  return Object.entries(opts)
    .flatMap(([svc, entries]) => {
      const meta = STREAM_META[svc] || {
        name: svc,
        color: C.textDim,
        icon: svc[0]?.toUpperCase() || "?",
      };
      const list = Array.isArray(entries) ? entries : [entries];
      return list.slice(0, 1).map((entry) => ({
        service: svc,
        name: meta.name,
        color: meta.color,
        icon: meta.icon,
        type: entry?.type || "subscription",
        link: entry?.link || entry?.url || null,
        quality: entry?.quality || entry?.videoQuality || null,
        price:
          entry?.price?.formatted || (entry?.price ? `$${entry.price}` : null),
        leaving: entry?.leaving
          ? new Date(entry.leaving * 1000).toLocaleDateString("pt-BR")
          : null,
      }));
    })
    .filter((s) => s.name)
    .sort((a, b) => {
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

// ─────────────────────────────────────────────
//  SOCIAL MOCK DATA
// ─────────────────────────────────────────────
const MOCK_USERS = [
  {
    id: 1,
    name: "Alex Mercer",
    username: "alexm",
    initials: "AM",
    color: "#2563EB",
    reviews: 12,
    friends: 8,
  },
  {
    id: 2,
    name: "Sofia Reyes",
    username: "sofiar",
    initials: "SR",
    color: "#9333EA",
    reviews: 27,
    friends: 15,
  },
  {
    id: 3,
    name: "Kai Nakamura",
    username: "kain",
    initials: "KN",
    color: "#16A34A",
    reviews: 9,
    friends: 6,
  },
  {
    id: 4,
    name: "Luca Mago",
    username: "lucamago",
    initials: "LM",
    color: C.gold,
    reviews: 19,
    friends: 11,
  },
];
const MOCK_REVIEWS = [
  {
    movieTmdbId: 872585,
    userId: 4,
    rating: 5,
    text: "Uma obra monumental. Nolan superou tudo. A cena da detonação é de tirar o fôlego.",
    date: "15 Jan 2024",
  },
  {
    movieTmdbId: 693134,
    userId: 4,
    rating: 4,
    text: "Villeneuve consolida sua visão épica. A segunda parte entrega tudo que a primeira prometeu.",
    date: "3 Mar 2024",
  },
  {
    movieTmdbId: 792307,
    userId: 4,
    rating: 5,
    text: "Lanthimos em sua melhor forma. Emma Stone está absolutamente fora de si.",
    date: "8 Fev 2024",
  },
];
const MOCK_GROUPS = [
  { id: 1, name: "Cinéphiles do Recife", members: [1, 2, 3, 4] },
  { id: 2, name: "Weekend Watchlist", members: [1, 4] },
];
const GROUP_RECS = {
  1: {
    1: [872585, 693134, 792307, 940551],
    2: [872585, 976573, 1014577, 693134],
    3: [507089, 940551, 872585, 792307],
    4: [872585, 693134, 792307, 1011985],
  },
  2: { 1: [872585, 792307], 4: [693134, 940551] },
};


// ─────────────────────────────────────────────
//  RELEASE HELPERS
// ─────────────────────────────────────────────
function isUpcoming(movie) {
  if (!movie.releaseDate) return false;
  return new Date(movie.releaseDate) > new Date();
}
function formatReleaseDateBR(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────
//  TMDB GENRE MAP (PT label → numeric id)
// ─────────────────────────────────────────────
const GENRE_NAME_TO_ID = {
  "Ação": 28,
  "Aventura": 12,
  "Animação": 16,
  "Comédia": 35,
  "Crime": 80,
  "Documentário": 99,
  "Drama": 18,
  "Família": 10751,
  "Fantasia": 14,
  "História": 36,
  "Terror": 27,
  "Música": 10402,
  "Mistério": 9648,
  "Romance": 10749,
  "Ficção Científica": 878,
  "Cinema TV": 10770,
  "Thriller": 53,
  "Guerra": 10752,
  "Faroeste": 37,
};

export {
  MONKEY_AVATARS, resolveAvatarUrl, C, apiCache, cachedFetch, TMDB_IMG, tmdb, omdb, streaming,
  normalizeTmdb, mergeOmdb, STREAM_META, parseStreamingServices,
  MOCK_USERS, MOCK_REVIEWS, MOCK_GROUPS,
  isUpcoming, formatReleaseDateBR, GENRE_NAME_TO_ID,
};
export {
  Film, ClipboardList, Star, User, Users, Search, Handshake, Pencil, Link2,
  TrendingUp, Target, Radio, Calendar, X, Flame, UserRound, Bookmark,
  Clapperboard, Eye, EyeOff, Share2, ListVideo, Award, Zap, ChevronLeft,
  ChevronRight, Plus, SkipForward, Upload, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
export { default as JSZip } from "jszip";
export { default as Papa } from "papaparse";
export { logoMain, mascotsNav, logoText, mascotWizard, mascotSpeak, mascotSee,
  monkeyDirector, monkeyPopcorn, monkeyDetective, monkeyStar, monkeyAstronaut,
  monkeyGym, monkeyEars, monkeyStrong, monkeyShy, monkeyFlash, monkeyCrew, monkeySearch, monkeyGirl, monkeyMute};
export { supabase };
export { toast };
export { useState, useEffect, useRef, useCallback, useMemo };
export { createPortal };
export { tmdbProxy, omdbProxy, streamingProxy };
