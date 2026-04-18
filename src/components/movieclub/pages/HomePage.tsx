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

  // Classe utilitária para alinhar os esqueletos de carregamento perfeitamente com os carrosséis
  const skeletonWrapperClass = "flex overflow-x-hidden pb-4 pt-2 -ml-4 md:-ml-10 px-4 md:px-10 gap-[12px]";

  return (
    <div className="pt-0 pb-[60px] relative w-full overflow-hidden">
      
      {/* O HeroBanner fica FORA da div com max-width. 
        Isso garante que ele ocupe 100% da tela do celular de ponta a ponta. 
      */}
      {trend.movies.length > 0 ? (
        <HeroBanner movies={trend.movies} onSelect={go} />
      ) : (
        initialLoading && (
          <div className="h-[450px] md:h-[520px] flex items-center justify-center w-full bg-[#0B0F19]">
            <Spinner size={36} />
          </div>
        )
      )}

      {/* Container Principal: Mantém as listas alinhadas e não deixa o conteúdo 
        ficar largo demais em monitores gigantes (max-w-[1400px]).
      */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-10 w-full overflow-x-hidden mt-6">
        
        <Section title={<><Flame size={18} className="inline mr-2 text-red-500" /> Top 10 da Semana</>}>
          {top10Loading ? (
            <div className={skeletonWrapperClass} style={{ width: "calc(100% + 32px)" }}>
              {Array(5).fill(0).map((_, i) => <div key={i} className="flex-none"><SkeletonCard w={130} /></div>)}
            </div>
          ) : (
            <Carousel>{top10.map((m, i) => <Top10Card key={m.id} movie={m} rank={i + 1} onClick={() => go(m)} />)}</Carousel>
          )}
        </Section>

        {recs.length > 0 && (
          <Section title={<><Target size={18} className="inline mr-2" style={{ color: "#C9A84C" }} /> Recomendados para Você</>}>
            {recsLoading ? (
              <div className={skeletonWrapperClass} style={{ width: "calc(100% + 32px)" }}>
                {Array(8).fill(0).map((_, i) => <div key={i} className="flex-none"><SkeletonCard /></div>)}
              </div>
            ) : (
              <Carousel movies={recs} onMovieClick={go} />
            )}
          </Section>
        )}

        <Section title="Em Alta Agora" action={{ label: "Buscar", onClick: () => setPage("search") }}>
          {trend.loading ? (
            <div className={skeletonWrapperClass} style={{ width: "calc(100% + 32px)" }}>
              {Array(8).fill(0).map((_, i) => <div key={i} className="flex-none"><SkeletonCard /></div>)}
            </div>
          ) : (
            <Carousel movies={trend.movies} onMovieClick={go} />
          )}
          <PaginationBar page={trend.page} totalPages={trend.totalPages} totalResults={trend.totalResults} onPageChange={trend.goTo} />
        </Section>

        {genres.length > 0 && (
          <div className="mb-10 w-full">
            <h3 className="font-outfit text-lg font-bold mb-4" style={{ color: C.text }}>
              Explorar por Gênero
            </h3>
            <div className="flex gap-2 flex-wrap mb-5">
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveG(activeG?.id === g.id ? null : g)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200"
                  style={{
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
              <div className={skeletonWrapperClass} style={{ width: "calc(100% + 32px)" }}>
                {Array(8).fill(0).map((_, i) => <div key={i} className="flex-none"><SkeletonCard /></div>)}
              </div>
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
             <div className={skeletonWrapperClass} style={{ width: "calc(100% + 32px)" }}>
               {Array(8).fill(0).map((_, i) => <div key={i} className="flex-none"><SkeletonCard /></div>)}
             </div>
          ) : (
            <Carousel movies={pop.movies} onMovieClick={go} />
          )}
          <PaginationBar page={pop.page} totalPages={pop.totalPages} totalResults={pop.totalResults} onPageChange={pop.goTo} />
        </Section>

        <Section title="Melhor Avaliados">
          {top.loading ? (
             <div className={skeletonWrapperClass} style={{ width: "calc(100% + 32px)" }}>
               {Array(8).fill(0).map((_, i) => <div key={i} className="flex-none"><SkeletonCard /></div>)}
             </div>
          ) : (
            <Carousel movies={top.movies} onMovieClick={go} />
          )}
          <PaginationBar page={top.page} totalPages={top.totalPages} totalResults={top.totalResults} onPageChange={top.goTo} />
        </Section>
      </div>

      <div className="flex justify-center py-10 pb-5 opacity-15">
        <img src={mascotsNav} alt="MovieClub Mascots" className="w-[200px] grayscale-[30%]" />
      </div>
      <FilmStripBg />
    </div>
  );
}