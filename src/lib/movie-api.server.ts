const TMDB_BASE = "https://api.themoviedb.org/3";
const OMDB_BASE = "https://www.omdbapi.com";

function getTmdbKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    console.error("TMDB_API_KEY is not configured in process.env. Available env keys:", Object.keys(process.env).filter(k => k.includes("TMDB") || k.includes("OMDB")));
    throw new Error("TMDB_API_KEY is not configured. Please ensure the secret is saved in Lovable Cloud.");
  }
  return key;
}

function getOmdbKey() {
  return process.env.OMDB_API_KEY || null;
}

export async function tmdbGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", getTmdbKey());
  url.searchParams.set("language", "pt-BR");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`TMDb ${r.status}: ${r.statusText}`);
  return r.json();
}

export async function omdbGet(params: Record<string, string>) {
  const key = getOmdbKey();
  if (!key) return null;
  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", key);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString());
  if (!r.ok) return null;
  const d = await r.json();
  return d.Response === "True" ? d : null;
}
