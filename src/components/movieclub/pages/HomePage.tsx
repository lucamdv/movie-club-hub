// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { C, tmdb, normalizeTmdb, mascotsNav } from "../foundation";
import { Flame, Target } from "lucide-react";
import {
  Spinner, SkeletonCard, Section, FilmStripBg,
  Carousel, PaginationBar, HeroBanner, Top10Card,
} from "../ui";
import { usePaginatedMovies, useRecommendations } from "../hooks";

export function HomePage({ setPage, setSelectedMovie, auth: authCtx }) {
  const [genres, setGenres] = useState([]);
  const [activeG, setActiveG] = useState(null);
  const [top10, setTop10] = useState([]);
  const [top10Loading, setTop10Loading] = useState(true);

  const trendingFetcher = useCallback((p) => tmdb.trending(p), []);
  const popularFetcher = useCallback((p) => tmdb.popular(p), []);
  const topRatedFetcher = useCallback((p) => tmdb.topRated(p), []);

  const trend = usePaginatedMovies(trendingFetcher);
  const pop = usePaginatedMovies(popularFetcher);
  const top = usePaginatedMovies(topRatedFetcher);

  const { recs, loading: recsLoading } = useRecommendations(authCtx?.user?.id);

  useEffect(() => {
    setTop10Loading(true);
    tmdb
      .get("/trending/movie/week")
      .then((d) => {
        const movies = (d.results || []).slice(0, 10).map(normalizeTmdb).filter(Boolean);
        setTop10(movies);
        setTop10Loading(false);
      })
      .catch(() => setTop10Loading(false));
  }, []);

  const [genreMovs, setGenreMovs] = useState([]);
  const [genrePage, setGenrePage] = useState(1);
  const [genreTotalPages, setGenreTotalPages] = useState(1);
  const [genreTotalResults, setGenreTotalResults] = useState(0);
  const [loadingG, setLoadingG] = useState(false);

  const loadGenre = useCallback((gid, p) => {
    setLoadingG(true);
    tmdb
      .byGenre(gid, p)
      .then((d) => {
        setGenreMovs((d.results || []).map(normalizeTmdb).filter(Boolean));
        setGenrePage(d.appPage || p);
        setGenreTotalPages(d.totalAppPages || 1);
        setGenreTotalResults(d.totalResults || 0);
        setLoadingG(false);
      })
      .catch(() => setLoadingG(false));
  }, []);

  useEffect(() => {
    tmdb.genres().then((g) => setGenres(g.genres || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeG) loadGenre(activeG.id, 1);
  }, [activeG, loadGenre]);

  const go = (m) => { setSelectedMovie(m); setPage("movie"); };
  const initialLoading = trend.loading && trend.movies.length === 0;

  return (
    <div style={{ paddingTop: 0, paddingBottom: 60 }}>
      {trend.movies.length > 0 ? (
        <HeroBanner movies={trend.movies} onSelect={go} />
      ) : (
        initialLoading && (
          <div style={{ height: 520, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spinner size={36} />
          </div>
        )
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px" }}>
        <Section title={<><Flame size={18} style={{ display: "inline", color: "#EF4444" }} /> Top 10 da Semana</>}>
          {top10Loading ? (
            <div style={{ display: "flex", gap: 12 }}>{Array(5).fill(0).map((_, i) => <SkeletonCard key={i} w={130} />)}</div>
          ) : (
            <Carousel>{top10.map((m, i) => <Top10Card key={m.id} movie={m} rank={i + 1} onClick={() => go(m)} />)}</Carousel>
          )}
        </Section>

        {recs.length > 0 && (
          <Section title={<><Target size={18} style={{ display: "inline", color: "#C9A84C" }} /> Recomendados para Você</>}>
            {recsLoading ? (
              <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : (
              <Carousel movies={recs} onMovieClick={go} />
            )}
          </Section>
        )}

        <Section title="Em Alta Agora" action={{ label: "Buscar", onClick: () => setPage("search") }}>
          {trend.loading ? (
            <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <Carousel movies={trend.movies} onMovieClick={go} />
          )}
          <PaginationBar page={trend.page} totalPages={trend.totalPages} totalResults={trend.totalResults} onPageChange={trend.goTo} />
        </Section>

        {genres.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>
              Explorar por Gênero
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveG(activeG?.id === g.id ? null : g)}
                  style={{
                    padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    whiteSpace: "nowrap", transition: "all 0.2s",
                    background: activeG?.id === g.id ? C.gold : C.bgCard,
                    color: activeG?.id === g.id ? C.bgDeep : C.textMuted,
                    border: `1px solid ${activeG?.id === g.id ? C.gold : C.border}`,
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>
            {activeG && (loadingG ? (
              <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : (
              <>
                <Carousel movies={genreMovs} onMovieClick={go} />
                <PaginationBar page={genrePage} totalPages={genreTotalPages} totalResults={genreTotalResults} onPageChange={(p) => loadGenre(activeG.id, p)} />
              </>
            ))}
          </div>
        )}

        <Section title="Mais Populares">
          {pop.loading ? (
            <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <Carousel movies={pop.movies} onMovieClick={go} />
          )}
          <PaginationBar page={pop.page} totalPages={pop.totalPages} totalResults={pop.totalResults} onPageChange={pop.goTo} />
        </Section>

        <Section title="Melhor Avaliados">
          {top.loading ? (
            <div style={{ display: "flex", gap: 12 }}>{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : (
            <Carousel movies={top.movies} onMovieClick={go} />
          )}
          <PaginationBar page={top.page} totalPages={top.totalPages} totalResults={top.totalResults} onPageChange={top.goTo} />
        </Section>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "40px 0 20px", opacity: 0.15 }}>
        <img src={mascotsNav} alt="MovieClub Mascots" style={{ width: 200, filter: "grayscale(0.3)" }} />
      </div>
      <FilmStripBg />
    </div>
  );
}
