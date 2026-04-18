// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { C, tmdb, normalizeTmdb } from "../foundation";
import { Film, Search } from "lucide-react";
import {
  Spinner, MovieCard, Badge, PaginationBar, ViewToolbar,
  SearchSVG,
} from "../ui";

const SORT_OPTIONS = [
  { value: "popularity.desc", label: "Mais Populares" },
  { value: "popularity.asc", label: "Menos Populares" },
  { value: "vote_average.desc", label: "Melhor Avaliados" },
  { value: "vote_average.asc", label: "Pior Avaliados" },
  { value: "release_date.desc", label: "Mais Recentes" },
  { value: "release_date.asc", label: "Mais Antigos" },
  { value: "revenue.desc", label: "Maior Bilheteria" },
];

const LANG_OPTIONS = [
  { value: "", label: "Qualquer idioma" },
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
  { value: "de", label: "Alemão" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "Japonês" },
  { value: "ko", label: "Coreano" },
  { value: "zh", label: "Chinês" },
];

export function SearchPage({ setPage, setSelectedMovie }) {
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
  const [viewMode, setViewMode] = useState("grid");
  const [perPage, setPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const debRef = useRef(null);

  useEffect(() => {
    tmdb.genres().then((d) => setGenres(d.genres || [])).catch(() => {});
  }, []);

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

  const toggleGenre = (gid) =>
    setSelectedGenres((prev) => prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]);

  const handlePageChange = (pg) => {
    if (query.trim()) doSearch(query, pg);
    else doDiscover(pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSelectedGenres([]); setSortBy("popularity.desc");
    setYearFrom(""); setYearTo(""); setRatingMin(""); setLang("");
  };

  const hasFilters = selectedGenres.length > 0 || sortBy !== "popularity.desc" || yearFrom || yearTo || ratingMin || lang;
  const currentYear = new Date().getFullYear();

  const selectStyle = {
    padding: "8px 12px", borderRadius: 8, background: C.bgCard,
    border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
    outline: "none", minWidth: 140, cursor: "pointer",
  };
  const inputSmStyle = {
    padding: "8px 12px", borderRadius: 8, background: C.bgCard,
    border: `1px solid ${C.border}`, color: C.text, fontSize: 13,
    outline: "none", width: 80, textAlign: "center",
  };

  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 700, color: C.text }}>
            Buscar <span style={{ color: C.gold }}>Filmes</span>
          </h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ViewToolbar viewMode={viewMode} setViewMode={setViewMode} perPage={perPage} setPerPage={setPerPage} />
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 8, background: showFilters ? C.gold : C.bgCard,
                color: showFilters ? C.bgDeep : C.textMuted,
                border: `1px solid ${showFilters ? C.gold : C.border}`,
                fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
              }}
            >
              Filtros{" "}
              {hasFilters && (
                <span style={{ background: showFilters ? C.bgDeep : C.gold, color: showFilters ? C.gold : C.bgDeep, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>●</span>
              )}
            </button>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <SearchSVG size={18} />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título…"
            style={{
              width: "100%", paddingLeft: 48, paddingRight: 20, paddingTop: 14, paddingBottom: 14,
              borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 15, outline: "none", transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.gold)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          {loading && (
            <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
              <Spinner size={18} />
            </div>
          )}
        </div>

        {showFilters && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Gêneros
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    style={{
                      padding: "5px 14px", borderRadius: 16, fontSize: 11, fontWeight: 500,
                      whiteSpace: "nowrap", transition: "all 0.2s",
                      background: selectedGenres.includes(g.id) ? C.gold : "transparent",
                      color: selectedGenres.includes(g.id) ? C.bgDeep : C.textMuted,
                      border: `1px solid ${selectedGenres.includes(g.id) ? C.gold : C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Ordenar</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Ano</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="number" min="1888" max={currentYear} placeholder="De" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} style={inputSmStyle} />
                  <span style={{ color: C.textDim, fontSize: 12 }}>—</span>
                  <input type="number" min="1888" max={currentYear} placeholder="Até" value={yearTo} onChange={(e) => setYearTo(e.target.value)} style={inputSmStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Nota mínima</label>
                <select value={ratingMin} onChange={(e) => setRatingMin(e.target.value)} style={selectStyle}>
                  <option value="">Qualquer</option>
                  {[9, 8, 7, 6, 5, 4, 3].map((n) => <option key={n} value={String(n)}>≥ {n}/10</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginBottom: 4, display: "block", textTransform: "uppercase" }}>Idioma</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)} style={selectStyle}>
                  {LANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", color: C.gold, border: `1px solid ${C.gold}`, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✕ Limpar
                </button>
              )}
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
            {viewMode === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
                {results.slice(0, perPage).map((m) => (
                  <MovieCard key={m.id} movie={m} onClick={() => { setSelectedMovie(m); setPage("movie"); }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {results.slice(0, perPage).map((m) => (
                  <div
                    key={m.id}
                    style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, display: "flex", gap: 16, alignItems: "center", cursor: "pointer", transition: "all 0.2s" }}
                    className="card-hover"
                    onClick={() => { setSelectedMovie(m); setPage("movie"); }}
                  >
                    <div style={{ width: 50, height: 75, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: C.bgDeep }}>
                      {m.poster && <img src={m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>{m.title}</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {m.year && <span style={{ fontSize: 12, color: C.textDim }}>{m.year}</span>}
                        {m.genre && <Badge color="rgba(201,168,76,0.1)" textColor={C.goldDim} small>{m.genre}</Badge>}
                        {m.rating && <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>★ {m.rating}</span>}
                      </div>
                      {m.overview && (
                        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {m.overview}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PaginationBar page={currentPage} totalPages={totalPages} totalResults={totalResults} onPageChange={handlePageChange} />
          </>
        ) : !loading && (query || hasFilters) ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
            <div style={{ marginBottom: 12 }}><Search size={32} style={{ color: "#4A5E72" }} /></div>
            <p style={{ fontSize: 15 }}>Nenhum resultado encontrado</p>
          </div>
        ) : null}

        {!query && !hasFilters && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
            <div style={{ marginBottom: 12 }}><Film size={40} style={{ color: "#4A5E72" }} /></div>
            <p style={{ fontSize: 15 }}>Digite um título ou use os filtros para explorar</p>
          </div>
        )}
      </div>
    </div>
  );
}
