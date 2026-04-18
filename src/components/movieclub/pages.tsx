// @ts-nocheck
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import Papa from "papaparse";
import {
  C, MONKEY_AVATARS, tmdb, omdb, streaming, normalizeTmdb, mergeOmdb,
  STREAM_META, parseStreamingServices, cachedFetch,
  MOCK_USERS, MOCK_REVIEWS, MOCK_GROUPS,
  isUpcoming, formatReleaseDateBR,
  logoMain, mascotsNav, logoText,
  mascotWizard, mascotSpeak, mascotSee,
  monkeyDirector, monkeyPopcorn, monkeyDetective, monkeyStar, monkeyAstronaut,
  monkeyGym, monkeyEars, monkeyStrong, monkeyShy, monkeyFlash, monkeyCrew, monkeySearch,
} from "./foundation";
import {
  Film, ClipboardList, Star, User, Users, Search, Handshake, Pencil, Link2,
  TrendingUp, Target, Radio, Calendar, X, Flame, UserRound, Bookmark,
  Clapperboard, Eye, EyeOff, Share2, ListVideo, Award, Zap, ChevronLeft,
  ChevronRight, Plus, SkipForward, Upload, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import {
  useMovieDetails, usePaginatedMovies, useAuth, useRatings, useWatchlist,
  useRecommendations, useFollows, useFriendLinks, useFriendships,
  useClubs, useClubDetail,
} from "./hooks";
import {
  Spinner, SkeletonCard, StarRating,
  Avatar, Badge, Btn, TextInput, Section, FilmStripBg,
  StreamingBadges, RatingsRow, MovieCard, MiniPoster,
  BackIcon, PlusIcon, CheckIcon, UsersIcon, LinkIcon, CopyIcon,
  UserPlusIcon, UserCheckIcon, ShareIcon, SearchSVG, KeyIcon, PlayIcon,
  HeartIcon, ChevronLeftIcon, GridIcon, ListIcon, ChevronRightIcon,
  ViewToolbar, Carousel, Navbar,
  PaginationBar, HeroBanner, Top10Card, SplashScreen,
} from "./ui";

function SettingsPage({ apiStatus }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});
  const testApis = async () => {
    setTesting(true);
    setResults({});
    try {
      const tmdbRes = await tmdb.popular();
      setResults((r) => ({
        ...r,
        tmdb: {
          ok: !!tmdbRes?.results,
          msg: tmdbRes?.results
            ? `✓ TMDb respondeu com ${tmdbRes.results.length} filmes`
            : "✗ Falha na resposta",
        },
      }));
    } catch (e) {
      setResults((r) => ({
        ...r,
        tmdb: { ok: false, msg: `✗ Erro: ${e.message}` },
      }));
    }
    try {
      const omdbRes = await omdb.byTitle("Inception", 2010);
      setResults((r) => ({
        ...r,
        omdb: {
          ok: !!omdbRes?.Title,
          msg: omdbRes?.Title
            ? `✓ OMDb: "${omdbRes.Title}" (${omdbRes.Year})`
            : "✗ Sem resposta",
        },
      }));
    } catch (e) {
      setResults((r) => ({
        ...r,
        omdb: { ok: false, msg: `✗ Erro: ${e.message}` },
      }));
    }
    setTesting(false);
  };
  const APIS = [
    {
      key: "tmdb",
      label: "TMDb API",
      color: "#01B4E4",
      desc: "Pôsteres, metadados, elenco, trailers, busca e recomendações.",
      secret: "TMDB_API_KEY",
    },
    {
      key: "omdb",
      label: "OMDb API",
      color: "#F5C518",
      desc: "Ratings IMDb, Rotten Tomatoes, Metacritic, bilheteria e prêmios.",
      secret: "OMDB_API_KEY",
    },
    {
      key: "streaming",
      label: "Streaming Availability",
      color: "#0055DA",
      desc: "Onde assistir no Brasil — Netflix, Prime, Disney+, Max e mais.",
      secret: "STREAMING_AVAILABILITY_API_KEY",
    },
  ];
  return (
    <div style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 28px" }}>
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}
        >
          Status das <span style={{ color: C.gold }}>APIs</span>
        </h1>
        <p
          style={{
            color: C.textMuted,
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          As chaves de API estão configuradas no{" "}
          <strong style={{ color: C.text }}>servidor</strong>.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {APIS.map((api) => {
            const result = results[api.key];
            return (
              <div
                key={api.key}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: api.color,
                      flexShrink: 0,
                    }}
                  />
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                    {api.label}
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    marginBottom: 10,
                    lineHeight: 1.6,
                    paddingLeft: 20,
                  }}
                >
                  {api.desc}
                </p>
                {result && (
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      color: result.ok ? C.success : C.red,
                      padding: "7px 12px",
                      borderRadius: 8,
                      background: result.ok
                        ? "rgba(34,197,94,0.07)"
                        : "rgba(239,68,68,0.07)",
                    }}
                  >
                    {result.msg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 28 }}>
          <Btn variant="gold" onClick={testApis}>
            {testing ? (
              <>
                <Spinner size={14} /> Testando…
              </>
            ) : (
              <>
                <CheckIcon /> Testar APIs
              </>
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PAGINATION

function HomePage({ setPage, setSelectedMovie, auth: authCtx }) {
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

  // Top 10 weekly
  useEffect(() => {
    setTop10Loading(true);
    tmdb
      .get("/trending/movie/week")
      .then((d) => {
        const movies = (d.results || [])
          .slice(0, 10)
          .map(normalizeTmdb)
          .filter(Boolean);
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
    tmdb
      .genres()
      .then((g) => setGenres(g.genres || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (activeG) loadGenre(activeG.id, 1);
  }, [activeG, loadGenre]);

  const go = (m) => {
    setSelectedMovie(m);
    setPage("movie");
  };
  const initialLoading = trend.loading && trend.movies.length === 0;

  return (
    <div style={{ paddingTop: 0, paddingBottom: 60 }}>
      {/* Hero Banner */}
      {trend.movies.length > 0 ? (
        <HeroBanner movies={trend.movies} onSelect={go} />
      ) : (
        initialLoading && (
          <div
            style={{
              height: 520,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Spinner size={36} />
          </div>
        )
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px" }}>
        {/* Top 10 Weekly */}
        <Section
          title={
            <>
              <Flame
                size={18}
                style={{ display: "inline", color: "#EF4444" }}
              />{" "}
              Top 10 da Semana
            </>
          }
        >
          {top10Loading ? (
            <div style={{ display: "flex", gap: 12 }}>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <SkeletonCard key={i} w={130} />
                ))}
            </div>
          ) : (
            <Carousel>
              {top10.map((m, i) => (
                <Top10Card
                  key={m.id}
                  movie={m}
                  rank={i + 1}
                  onClick={() => go(m)}
                />
              ))}
            </Carousel>
          )}
        </Section>

        {/* Personalized Recommendations */}
        {recs.length > 0 && (
          <Section
            title={
              <>
                <Target
                  size={18}
                  style={{ display: "inline", color: "#C9A84C" }}
                />{" "}
                Recomendados para Você
              </>
            }
          >
            {recsLoading ? (
              <div style={{ display: "flex", gap: 12 }}>
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
              </div>
            ) : (
              <Carousel movies={recs} onMovieClick={go} />
            )}
          </Section>
        )}

        {/* Trending Carousel */}
        <Section
          title="Em Alta Agora"
          action={{ label: "Buscar", onClick: () => setPage("search") }}
        >
          {trend.loading ? (
            <div style={{ display: "flex", gap: 12 }}>
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
            </div>
          ) : (
            <Carousel movies={trend.movies} onMovieClick={go} />
          )}
          <PaginationBar
            page={trend.page}
            totalPages={trend.totalPages}
            totalResults={trend.totalResults}
            onPageChange={trend.goTo}
          />
        </Section>

        {/* Genre explorer */}
        {genres.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h3
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                marginBottom: 16,
              }}
            >
              Explorar por Gênero
            </h3>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveG(activeG?.id === g.id ? null : g)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    transition: "all 0.2s",
                    background: activeG?.id === g.id ? C.gold : C.bgCard,
                    color: activeG?.id === g.id ? C.bgDeep : C.textMuted,
                    border: `1px solid ${activeG?.id === g.id ? C.gold : C.border}`,
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>
            {activeG &&
              (loadingG ? (
                <div style={{ display: "flex", gap: 12 }}>
                  {Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                </div>
              ) : (
                <>
                  <Carousel movies={genreMovs} onMovieClick={go} />
                  <PaginationBar
                    page={genrePage}
                    totalPages={genreTotalPages}
                    totalResults={genreTotalResults}
                    onPageChange={(p) => loadGenre(activeG.id, p)}
                  />
                </>
              ))}
          </div>
        )}

        {/* Popular Carousel */}
        <Section title="Mais Populares">
          {pop.loading ? (
            <div style={{ display: "flex", gap: 12 }}>
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
            </div>
          ) : (
            <Carousel movies={pop.movies} onMovieClick={go} />
          )}
          <PaginationBar
            page={pop.page}
            totalPages={pop.totalPages}
            totalResults={pop.totalResults}
            onPageChange={pop.goTo}
          />
        </Section>

        {/* Top Rated Carousel */}
        <Section title="Melhor Avaliados">
          {top.loading ? (
            <div style={{ display: "flex", gap: 12 }}>
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
            </div>
          ) : (
            <Carousel movies={top.movies} onMovieClick={go} />
          )}
          <PaginationBar
            page={top.page}
            totalPages={top.totalPages}
            totalResults={top.totalResults}
            onPageChange={top.goTo}
          />
        </Section>
      </div>

      {/* Branding footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "40px 0 20px",
          opacity: 0.15,
        }}
      >
        <img
          src={mascotsNav}
          alt="MovieClub Mascots"
          style={{ width: 200, filter: "grayscale(0.3)" }}
        />
      </div>
      <FilmStripBg />
    </div>
  );
}

function MoviePage({ movieInit, setPage, setSelectedMovie, auth: authCtx }) {
  const { movie, loading, streamServices } = useMovieDetails(
    movieInit?.tmdbId || movieInit?.id,
  );
  const m = movie || movieInit;
  const [liked, setLiked] = useState(false);
  const [review, setReview] = useState("");
  const {
    ratings: userRatings,
    upsertRating,
    getRating,
  } = useRatings(authCtx?.user?.id);
  const {
    isInList,
    add: addToWatchlist,
    remove: removeFromWatchlist,
  } = useWatchlist(authCtx?.user?.id);
  const existingRating = m ? getRating(m.tmdbId || m.id) : null;
  const [localRating, setLocalRating] = useState(0);
  const inWatchlist = m ? isInList(m.tmdbId || m.id) : false;

  useEffect(() => {
    if (existingRating) {
      setLocalRating(Number(existingRating.rating));
      setReview(existingRating.review || "");
    }
  }, [existingRating]);

  if (loading && !m)
    return (
      <div
        style={{
          paddingTop: 80,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Spinner size={38} />
          <p style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>
            Carregando…
          </p>
        </div>
      </div>
    );
  if (!m) return null;
  const reviews = MOCK_REVIEWS.filter((r) => r.movieTmdbId === m.tmdbId).map(
    (r) => ({ ...r, user: MOCK_USERS.find((u) => u.id === r.userId) }),
  );

  return (
    <div style={{ paddingTop: 60, paddingBottom: 60, minHeight: "100vh" }}>
      <div style={{ height: 420, position: "relative", overflow: "hidden" }}>
        {m.backdrop ? (
          <img
            src={m.backdrop}
            alt=""
            className="hero-backdrop"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.38,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg,#0a1e34,#1a2d48)`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, transparent 30%, ${C.bg} 100%)`,
          }}
        />
        <button
          onClick={() => setPage("home")}
          style={{
            position: "absolute",
            top: 20,
            left: 28,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            background: "rgba(9,21,35,0.7)",
            color: C.textMuted,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            zIndex: 1,
          }}
        >
          <BackIcon /> Voltar
        </button>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "-200px auto 0",
          padding: "0 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 40,
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              width: 200,
              height: 300,
              borderRadius: 14,
              flexShrink: 0,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              border: `2px solid ${C.border}`,
              background: C.bgCard,
            }}
          >
            {m.poster && (
              <img
                src={m.posterHD || m.poster}
                alt={m.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => (e.target.style.display = "none")}
              />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              {(m.genres?.length ? m.genres : [m.genre])
                .slice(0, 4)
                .map((g) => (
                  <Badge
                    key={g}
                    color="rgba(201,168,76,0.10)"
                    textColor={C.goldDim}
                  >
                    {g}
                  </Badge>
                ))}
              {m.rated && (
                <Badge color={C.bgCard} textColor={C.textDim}>
                  {m.rated}
                </Badge>
              )}
              {m.year && (
                <Badge color={C.bgCard} textColor={C.textDim}>
                  {m.year}
                </Badge>
              )}
              {m.runtime && (
                <Badge color={C.bgCard} textColor={C.textDim}>
                  {m.runtime} min
                </Badge>
              )}
            </div>
            <h1
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 36,
                fontWeight: 900,
                color: C.text,
                marginBottom: 4,
                lineHeight: 1.15,
              }}
            >
              {m.title}
            </h1>
            {m.tagline && (
              <p
                style={{
                  color: C.gold,
                  fontSize: 13,
                  fontStyle: "italic",
                  marginBottom: 14,
                }}
              >
                "{m.tagline}"
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: 20,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              {m.director && (
                <div>
                  <span
                    style={{ fontSize: 10, color: C.textDim, display: "block" }}
                  >
                    Direção
                  </span>
                  <span style={{ fontSize: 13, color: C.textMuted }}>
                    {m.director}
                  </span>
                </div>
              )}
              {m.writer && (
                <div>
                  <span
                    style={{ fontSize: 10, color: C.textDim, display: "block" }}
                  >
                    Roteiro
                  </span>
                  <span style={{ fontSize: 13, color: C.textMuted }}>
                    {m.writer.split(",")[0]}
                  </span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              {loading && !m.imdbRating ? (
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ width: 72, height: 62, borderRadius: 10 }}
                    />
                  ))}
                </div>
              ) : (
                <RatingsRow movie={m} />
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  color: C.textDim,
                  marginBottom: 7,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Onde Assistir no Brasil
              </p>
              <StreamingBadges
                services={streamServices}
                loading={loading && !streamServices.length}
              />
            </div>
            {(m.awards || m.boxOffice) && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                {m.awards && (
                  <div
                    style={{
                      background: "rgba(201,168,76,0.06)",
                      border: `1px solid rgba(201,168,76,0.2)`,
                      borderRadius: 8,
                      padding: "6px 12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        color: C.goldDim,
                        marginBottom: 2,
                      }}
                    >
                      Prêmios
                    </p>
                    <p style={{ fontSize: 12, color: C.gold }}>{m.awards}</p>
                  </div>
                )}
                {m.boxOffice && (
                  <div
                    style={{
                      background: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "6px 12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        color: C.textDim,
                        marginBottom: 2,
                      }}
                    >
                      Bilheteria
                    </p>
                    <p style={{ fontSize: 12, color: C.text }}>{m.boxOffice}</p>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn
                variant={inWatchlist ? "ghost" : "gold"}
                onClick={() => {
                  const tmdbId = m.tmdbId || m.id;
                  if (inWatchlist) removeFromWatchlist(tmdbId);
                  else addToWatchlist(tmdbId, m.title, m.poster);
                }}
              >
                {inWatchlist ? (
                  <>
                    <CheckIcon /> Na Watchlist
                  </>
                ) : (
                  <>
                    <PlusIcon /> Minha Lista
                  </>
                )}
              </Btn>
              <Btn variant="ghost" onClick={() => setLiked((l) => !l)}>
                <HeartIcon f={liked} /> Curtir
              </Btn>
              {m.trailer && (
                <a
                  href={`https://youtube.com/watch?v=${m.trailer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Btn variant="ghost">
                    <PlayIcon /> Trailer
                  </Btn>
                </a>
              )}
            </div>
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 28 }}
        >
          <div>
            <Section title="Sua Avaliação">
              <div
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <p
                  style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}
                >
                  {existingRating
                    ? `Sua nota: ${Number(existingRating.rating).toFixed(1)} ★`
                    : "Clique nas estrelas para avaliar"}
                </p>
                <StarRating
                  value={localRating}
                  max={5}
                  size={28}
                  interactive
                  onChange={async (val) => {
                    setLocalRating(val);
                    const tmdbId = m.tmdbId || m.id;
                    try {
                      await upsertRating(
                        tmdbId,
                        val,
                        review,
                        m.title,
                        m.poster,
                      );
                      toast.success(
                        existingRating
                          ? "Avaliação atualizada!"
                          : "Avaliação publicada!",
                      );
                    } catch (e) {
                      toast.error("Erro ao salvar avaliação");
                    }
                  }}
                />
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Escreva sua review (opcional)…"
                  rows={3}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: C.bgDeep,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: 13,
                    resize: "vertical",
                    outline: "none",
                  }}
                  onBlur={async () => {
                    if (
                      localRating > 0 &&
                      review !== (existingRating?.review || "")
                    ) {
                      const tmdbId = m.tmdbId || m.id;
                      await upsertRating(
                        tmdbId,
                        localRating,
                        review,
                        m.title,
                        m.poster,
                      ).catch(() => {});
                    }
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {existingRating && (
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await (
                          await import("@/integrations/supabase/client")
                        ).supabase
                          .from("ratings")
                          .delete()
                          .eq("id", existingRating.id);
                        setLocalRating(0);
                        setReview("");
                        toast.success("Avaliação removida");
                      }}
                    >
                      Remover avaliação
                    </Btn>
                  )}
                </div>
              </div>
            </Section>
            <Section title="Sinopse">
              <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.8 }}>
                {m.plot || m.overview}
              </p>
            </Section>
            {m.cast?.length > 0 && (
              <Section title="Elenco Principal">
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    overflowX: "auto",
                    paddingBottom: 8,
                  }}
                >
                  {m.cast.map((actor) => (
                    <div
                      key={actor.id}
                      style={{ textAlign: "center", flexShrink: 0, width: 78 }}
                    >
                      <div
                        style={{
                          width: 66,
                          height: 66,
                          borderRadius: "50%",
                          overflow: "hidden",
                          margin: "0 auto 6px",
                          background: C.bgCard,
                          border: `2px solid ${C.border}`,
                        }}
                      >
                        {actor.photo ? (
                          <img
                            src={actor.photo}
                            alt={actor.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                              opacity: 0.4,
                            }}
                          >
                            <UserRound size={20} />
                          </div>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: C.text,
                          lineHeight: 1.2,
                        }}
                      >
                        {actor.name}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: C.textDim,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 78,
                        }}
                      >
                        {actor.character}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            <Section title="Reviews da Comunidade">
              {reviews.map((r, i) => (
                <div
                  key={i}
                  style={{
                    background: C.bgCard,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 20,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Avatar user={r.user} size={34} />
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text,
                          }}
                        >
                          {r.user?.name}
                        </p>
                        <p style={{ fontSize: 11, color: C.textDim }}>
                          {r.date}
                        </p>
                      </div>
                    </div>
                    <StarRating value={r.rating} size={13} />
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: C.textMuted,
                      lineHeight: 1.7,
                      fontStyle: "italic",
                    }}
                  >
                    "{r.text}"
                  </p>
                </div>
              ))}
              {reviews.length === 0 && (
                <p
                  style={{ color: C.textDim, textAlign: "center", padding: 40 }}
                >
                  Nenhuma review ainda.
                </p>
              )}
            </Section>
          </div>
          <div>
            {m.similar?.length > 0 && (
              <Section title="Similares">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {m.similar.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedMovie(s);
                        setPage("movie");
                      }}
                      style={{
                        display: "flex",
                        gap: 10,
                        cursor: "pointer",
                        padding: 8,
                        borderRadius: 8,
                        background: C.bgCard,
                        border: `1px solid ${C.border}`,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.borderHover;
                        e.currentTarget.style.background = C.bgCardHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.style.background = C.bgCard;
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 66,
                          borderRadius: 4,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: C.bgDeep,
                        }}
                      >
                        {s.poster && (
                          <img
                            src={s.poster}
                            alt={s.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: C.text,
                            marginBottom: 2,
                          }}
                        >
                          {s.title}
                        </p>
                        <p style={{ fontSize: 11, color: C.textDim }}>
                          {s.year}
                        </p>
                        {s.rating && (
                          <p style={{ fontSize: 11, color: C.gold }}>
                            ★ {s.rating}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {m.recommendations?.length > 0 && (
              <Section title="Recomendados">
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {m.recommendations.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedMovie(s);
                        setPage("movie");
                      }}
                      style={{
                        display: "flex",
                        gap: 10,
                        cursor: "pointer",
                        padding: 8,
                        borderRadius: 8,
                        background: C.bgCard,
                        border: `1px solid ${C.border}`,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.borderHover;
                        e.currentTarget.style.background = C.bgCardHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.style.background = C.bgCard;
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 66,
                          borderRadius: 4,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: C.bgDeep,
                        }}
                      >
                        {s.poster && (
                          <img
                            src={s.poster}
                            alt={s.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: C.text,
                            marginBottom: 2,
                          }}
                        >
                          {s.title}
                        </p>
                        <p style={{ fontSize: 11, color: C.textDim }}>
                          {s.year}
                        </p>
                        {s.rating && (
                          <p style={{ fontSize: 11, color: C.gold }}>
                            ★ {s.rating}
                          </p>
                        )}
                      </div>
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
  const [viewMode, setViewMode] = useState("grid");
  const [perPage, setPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const debRef = useRef(null);

  useEffect(() => {
    tmdb
      .genres()
      .then((d) => setGenres(d.genres || []))
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async (q, pg) => {
    setLoading(true);
    const d = await tmdb
      .search(q, pg)
      .catch(() => ({ results: [], total_results: 0, total_pages: 1 }));
    setResults((d.results || []).map(normalizeTmdb).filter(Boolean));
    setTotalResults(d.total_results || 0);
    setTotalPages(Math.min(d.total_pages || 1, 500));
    setCurrentPage(pg);
    setLoading(false);
  }, []);

  const doDiscover = useCallback(
    async (pg) => {
      setLoading(true);
      const params = { sort_by: sortBy };
      if (selectedGenres.length > 0)
        params.with_genres = selectedGenres.join(",");
      if (yearFrom) params["primary_release_date.gte"] = `${yearFrom}-01-01`;
      if (yearTo) params["primary_release_date.lte"] = `${yearTo}-12-31`;
      if (ratingMin) params["vote_average.gte"] = ratingMin;
      if (lang) params.with_original_language = lang;
      if (ratingMin) params["vote_count.gte"] = "50";
      params.page = String(pg);
      const d = await tmdb
        .get("/discover/movie", params)
        .catch(() => ({ results: [], total_results: 0, total_pages: 1 }));
      setResults((d.results || []).map(normalizeTmdb).filter(Boolean));
      setTotalResults(d.total_results || 0);
      setTotalPages(Math.min(d.total_pages || 1, 500));
      setCurrentPage(pg);
      setLoading(false);
    },
    [sortBy, selectedGenres, yearFrom, yearTo, ratingMin, lang],
  );

  useEffect(() => {
    clearTimeout(debRef.current);
    if (!query.trim()) {
      if (selectedGenres.length > 0 || yearFrom || yearTo || ratingMin || lang)
        doDiscover(1);
      else {
        setResults([]);
        setTotalResults(0);
        setTotalPages(1);
      }
      return;
    }
    debRef.current = setTimeout(() => doSearch(query, 1), 360);
    return () => clearTimeout(debRef.current);
  }, [query]);

  useEffect(() => {
    if (query.trim()) return;
    if (
      selectedGenres.length > 0 ||
      yearFrom ||
      yearTo ||
      ratingMin ||
      lang ||
      sortBy !== "popularity.desc"
    )
      doDiscover(1);
    else {
      setResults([]);
      setTotalResults(0);
      setTotalPages(1);
    }
  }, [selectedGenres, sortBy, yearFrom, yearTo, ratingMin, lang, doDiscover]);

  const toggleGenre = (gid) =>
    setSelectedGenres((prev) =>
      prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid],
    );
  const handlePageChange = (pg) => {
    if (query.trim()) doSearch(query, pg);
    else doDiscover(pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const clearFilters = () => {
    setSelectedGenres([]);
    setSortBy("popularity.desc");
    setYearFrom("");
    setYearTo("");
    setRatingMin("");
    setLang("");
  };
  const hasFilters =
    selectedGenres.length > 0 ||
    sortBy !== "popularity.desc" ||
    yearFrom ||
    yearTo ||
    ratingMin ||
    lang;
  const currentYear = new Date().getFullYear();
  const selectStyle = {
    padding: "8px 12px",
    borderRadius: 8,
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: 13,
    outline: "none",
    minWidth: 140,
    cursor: "pointer",
  };
  const inputSmStyle = {
    padding: "8px 12px",
    borderRadius: 8,
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: 13,
    outline: "none",
    width: 80,
    textAlign: "center",
  };

  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Buscar <span style={{ color: C.gold }}>Filmes</span>
          </h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ViewToolbar
              viewMode={viewMode}
              setViewMode={setViewMode}
              perPage={perPage}
              setPerPage={setPerPage}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                background: showFilters ? C.gold : C.bgCard,
                color: showFilters ? C.bgDeep : C.textMuted,
                border: `1px solid ${showFilters ? C.gold : C.border}`,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Filtros{" "}
              {hasFilters && (
                <span
                  style={{
                    background: showFilters ? C.bgDeep : C.gold,
                    color: showFilters ? C.gold : C.bgDeep,
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  ●
                </span>
              )}
            </button>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <div
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <SearchSVG size={18} />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título…"
            style={{
              width: "100%",
              paddingLeft: 48,
              paddingRight: 20,
              paddingTop: 14,
              paddingBottom: 14,
              borderRadius: 12,
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 15,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = C.gold)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          {loading && (
            <div
              style={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <Spinner size={18} />
            </div>
          )}
        </div>

        {showFilters && (
          <div
            style={{
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.textMuted,
                  marginBottom: 8,
                  display: "block",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Gêneros
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 16,
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      transition: "all 0.2s",
                      background: selectedGenres.includes(g.id)
                        ? C.gold
                        : "transparent",
                      color: selectedGenres.includes(g.id)
                        ? C.bgDeep
                        : C.textMuted,
                      border: `1px solid ${selectedGenres.includes(g.id) ? C.gold : C.border}`,
                      cursor: "pointer",
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.textDim,
                    marginBottom: 4,
                    display: "block",
                    textTransform: "uppercase",
                  }}
                >
                  Ordenar
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={selectStyle}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.textDim,
                    marginBottom: 4,
                    display: "block",
                    textTransform: "uppercase",
                  }}
                >
                  Ano
                </label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number"
                    min="1888"
                    max={currentYear}
                    placeholder="De"
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                    style={inputSmStyle}
                  />
                  <span style={{ color: C.textDim, fontSize: 12 }}>—</span>
                  <input
                    type="number"
                    min="1888"
                    max={currentYear}
                    placeholder="Até"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    style={inputSmStyle}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.textDim,
                    marginBottom: 4,
                    display: "block",
                    textTransform: "uppercase",
                  }}
                >
                  Nota mínima
                </label>
                <select
                  value={ratingMin}
                  onChange={(e) => setRatingMin(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Qualquer</option>
                  {[9, 8, 7, 6, 5, 4, 3].map((n) => (
                    <option key={n} value={String(n)}>
                      ≥ {n}/10
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.textDim,
                    marginBottom: 4,
                    display: "block",
                    textTransform: "uppercase",
                  }}
                >
                  Idioma
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={selectStyle}
                >
                  {LANG_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "transparent",
                    color: C.gold,
                    border: `1px solid ${C.gold}`,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  ✕ Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {totalResults > 0 && (
          <p style={{ color: C.textDim, fontSize: 13, marginBottom: 16 }}>
            {totalResults.toLocaleString("pt-BR")} resultado
            {totalResults !== 1 ? "s" : ""}
            {query && <span style={{ color: C.gold }}> · "{query}"</span>}
            {hasFilters && !query && (
              <span style={{ color: C.gold }}> · filtros aplicados</span>
            )}
          </p>
        )}

        {results.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 16,
                }}
              >
                {results.slice(0, perPage).map((m) => (
                  <MovieCard
                    key={m.id}
                    movie={m}
                    onClick={() => {
                      setSelectedMovie(m);
                      setPage("movie");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {results.slice(0, perPage).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 16,
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    className="card-hover"
                    onClick={() => {
                      setSelectedMovie(m);
                      setPage("movie");
                    }}
                  >
                    <div
                      style={{
                        width: 50,
                        height: 75,
                        borderRadius: 8,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: C.bgDeep,
                      }}
                    >
                      {m.poster && (
                        <img
                          src={m.poster}
                          alt={m.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.text,
                          marginBottom: 2,
                        }}
                      >
                        {m.title}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {m.year && (
                          <span style={{ fontSize: 12, color: C.textDim }}>
                            {m.year}
                          </span>
                        )}
                        {m.genre && (
                          <Badge
                            color="rgba(201,168,76,0.1)"
                            textColor={C.goldDim}
                            small
                          >
                            {m.genre}
                          </Badge>
                        )}
                        {m.rating && (
                          <span
                            style={{
                              fontSize: 12,
                              color: C.gold,
                              fontWeight: 600,
                            }}
                          >
                            ★ {m.rating}
                          </span>
                        )}
                      </div>
                      {m.overview && (
                        <p
                          style={{
                            fontSize: 12,
                            color: C.textMuted,
                            marginTop: 4,
                            lineHeight: 1.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {m.overview}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PaginationBar
              page={currentPage}
              totalPages={totalPages}
              totalResults={totalResults}
              onPageChange={handlePageChange}
            />
          </>
        ) : !loading && (query || hasFilters) ? (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}
          >
            <div style={{ marginBottom: 12 }}>
              <Search size={32} style={{ color: "#4A5E72" }} />
            </div>
            <p style={{ fontSize: 15 }}>Nenhum resultado encontrado</p>
          </div>
        ) : null}

        {!query && !hasFilters && !loading && (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}
          >
            <div style={{ marginBottom: 12 }}>
              <Film size={40} style={{ color: "#4A5E72" }} />
            </div>
            <p style={{ fontSize: 15 }}>
              Digite um título ou use os filtros para explorar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportDataModal(props) {
  if (typeof document === "undefined") return null;
  return createPortal(<ImportDataModalInner {...props} />, document.body);
}
function ImportDataModalInner({ userId, onClose }) {
  const [step, setStep] = useState("select_platform"); // select_platform | instructions | processing | done
  const [progress, setProgress] = useState({
    total: 0,
    matched: 0,
    imported: 0,
    failed: 0,
    current: "",
  });
  const [summary, setSummary] = useState({
    ratings: 0,
    watchlist: 0,
    reviews: 0,
    skipped: [],
  });
  const fileRef = useRef(null);

  async function processZip(file) {
    setStep("processing");
    try {
      const zip = await JSZip.loadAsync(file);
      const csvFiles = {};
      const targetNames = [
        "ratings.csv",
        "reviews.csv",
        "watchlist.csv",
        "diary.csv",
      ];
      // Search all files in zip (including subdirectories)
      const allFiles = [];
      zip.forEach((path, entry) => {
        if (!entry.dir) allFiles.push({ path, entry });
      });
      for (const name of targetNames) {
        const found = allFiles.find((f) => f.path.toLowerCase().endsWith(name));
        if (found) {
          const text = await found.entry.async("text");
          csvFiles[name] = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
          }).data;
        }
      }

      // Merge ratings + reviews + diary into unified list (dedup by Name+Year, prefer review)
      const movieMap = new Map();
      const addToMap = (rows, hasReview = false) => {
        (rows || []).forEach((r) => {
          const name = r.Name?.trim();
          const year = r.Year?.trim();
          if (!name) return;
          const key = `${name}::${year}`;
          const existing = movieMap.get(key);
          const rating = parseFloat(r.Rating) || 0;
          const review = r.Review?.trim() || "";
          if (
            !existing ||
            (hasReview && review) ||
            (!existing.review && rating > 0)
          ) {
            movieMap.set(key, {
              name,
              year,
              rating,
              review,
              date: r.Date || "",
            });
          }
        });
      };
      addToMap(csvFiles["ratings.csv"]);
      addToMap(csvFiles["diary.csv"]);
      addToMap(csvFiles["reviews.csv"], true);

      // Watchlist
      const watchlistEntries = (csvFiles["watchlist.csv"] || [])
        .filter((r) => r.Name?.trim())
        .map((r) => ({
          name: r.Name.trim(),
          year: r.Year?.trim(),
        }));

      const allMovies = [...movieMap.values()];
      const totalCount = allMovies.length + watchlistEntries.length;
      setProgress((p) => ({ ...p, total: totalCount }));

      let importedRatings = 0,
        importedWl = 0,
        importedReviews = 0;
      const skipped = [];

      for (let i = 0; i < allMovies.length; i += 5) {
        const batch = allMovies.slice(i, i + 5);
        await Promise.all(
          batch.map(async (movie) => {
            setProgress((p) => ({ ...p, current: movie.name }));
            try {
              const searchParams = { query: movie.name };
              if (movie.year) searchParams.year = movie.year;
              const result = await tmdbProxy({
                data: { path: "/search/movie", params: searchParams },
              });
              const match = result?.results?.[0];
              if (!match) {
                skipped.push(movie.name);
                setProgress((p) => ({ ...p, failed: p.failed + 1 }));
                return;
              }
              const posterUrl = match.poster_path
                ? `${TMDB_IMG}/w300${match.poster_path}`
                : null;
              if (movie.rating > 0) {
                await supabase.from("ratings").upsert(
                  {
                    user_id: userId,
                    tmdb_id: match.id,
                    rating: movie.rating,
                    review: movie.review || null,
                    title: match.title,
                    poster_url: posterUrl,
                  },
                  { onConflict: "user_id,tmdb_id" },
                );
                importedRatings++;
                if (movie.review) importedReviews++;
              }
              setProgress((p) => ({
                ...p,
                matched: p.matched + 1,
                imported: p.imported + 1,
              }));
            } catch {
              skipped.push(movie.name);
              setProgress((p) => ({ ...p, failed: p.failed + 1 }));
            }
          }),
        );
        if (i + 5 < allMovies.length)
          await new Promise((r) => setTimeout(r, 300));
      }

      for (let i = 0; i < watchlistEntries.length; i += 5) {
        const batch = watchlistEntries.slice(i, i + 5);
        await Promise.all(
          batch.map(async (movie) => {
            setProgress((p) => ({ ...p, current: movie.name }));
            try {
              const searchParams = { query: movie.name };
              if (movie.year) searchParams.year = movie.year;
              const result = await tmdbProxy({
                data: { path: "/search/movie", params: searchParams },
              });
              const match = result?.results?.[0];
              if (!match) {
                skipped.push(movie.name);
                setProgress((p) => ({ ...p, failed: p.failed + 1 }));
                return;
              }
              const posterUrl = match.poster_path
                ? `${TMDB_IMG}/w300${match.poster_path}`
                : null;
              await supabase.from("watchlist").upsert(
                {
                  user_id: userId,
                  tmdb_id: match.id,
                  title: match.title,
                  poster_url: posterUrl,
                },
                { onConflict: "user_id,tmdb_id" },
              );
              importedWl++;
              setProgress((p) => ({
                ...p,
                matched: p.matched + 1,
                imported: p.imported + 1,
              }));
            } catch {
              skipped.push(movie.name);
              setProgress((p) => ({ ...p, failed: p.failed + 1 }));
            }
          }),
        );
        if (i + 5 < watchlistEntries.length)
          await new Promise((r) => setTimeout(r, 300));
      }

      setSummary({
        ratings: importedRatings,
        watchlist: importedWl,
        reviews: importedReviews,
        skipped,
      });
      setStep("done");
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Erro ao processar arquivo ZIP");
      setStep("upload");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 32,
          maxWidth: 500,
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Importar Dados
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {step === "select_platform" && (
          <div>
            <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 20 }}>
              De qual plataforma você deseja importar seu histórico?
            </p>
            <button
              onClick={() => setStep("instructions")}
              style={{
                width: "100%",
                padding: "16px",
                background: C.bgDeep,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#00E054")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = C.border)
              }
            >
              <span
                style={{
                  fontWeight: 800,
                  color: "#00E054",
                  fontSize: 18,
                  letterSpacing: "-0.5px",
                }}
              >
                Letterboxd
              </span>
            </button>
          </div>
        )}

        {step === "instructions" && (
          <div>
            <button
              onClick={() => setStep("select_platform")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: C.textMuted,
                cursor: "pointer",
                marginBottom: 20,
                fontSize: 13,
              }}
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            <ol
              style={{
                color: C.textMuted,
                fontSize: 14,
                lineHeight: 1.8,
                marginBottom: 24,
                paddingLeft: 18,
              }}
            >
              <li>
                1. Exporte seus dados do letterboxd através do link:{" "}
                <a
                  href="https://letterboxd.com/user/exportdata/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.gold, textDecoration: "underline" }}
                >
                  https://letterboxd.com/user/exportdata/
                </a>
              </li>
              <li>2. Clique em "Export data"</li>
              <li>3. Faça login com sua conta Letterboxd</li>
              <li>4. O download dos seus dados iniciará automaticamente</li>
              <li>5. Anexe o arquivo ZIP extraído na janela abaixo:</li>
            </ol>

            {/* Sua caixa de upload original continua aqui */}
            <div
              style={{
                border: `2px dashed ${C.border}`,
                borderRadius: 16,
                padding: "40px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = C.gold;
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = C.border;
                const f = e.dataTransfer.files[0];
                if (f) processZip(f);
              }}
            >
              <Upload size={40} style={{ color: C.gold, marginBottom: 12 }} />
              <p
                style={{
                  color: C.text,
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Arraste o arquivo ZIP aqui
              </p>
              <p style={{ color: C.textMuted, fontSize: 13 }}>
                ou clique para selecionar
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processZip(f);
                }}
              />
            </div>
          </div>
        )}

        {step === "processing" && (
          <div style={{ textAlign: "center" }}>
            <Loader2
              size={40}
              style={{
                color: C.gold,
                marginBottom: 16,
                animation: "spin 1s linear infinite",
              }}
            />
            <p
              style={{
                color: C.text,
                fontWeight: 600,
                fontSize: 16,
                marginBottom: 8,
              }}
            >
              Importando dados...
            </p>
            <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
              {progress.current}
            </p>
            <div
              style={{
                background: C.bgDeep,
                borderRadius: 8,
                height: 8,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 8,
                  background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})`,
                  width:
                    progress.total > 0
                      ? `${Math.round(((progress.imported + progress.failed) / progress.total) * 100)}%`
                      : "0%",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
              {[
                ["Encontrados", progress.total, C.text],
                ["Importados", progress.imported, C.success],
                ["Falhas", progress.failed, C.red],
              ].map(([l, v, c]) => (
                <div key={l}>
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: c,
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {v}
                  </p>
                  <p style={{ fontSize: 11, color: C.textMuted }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <CheckCircle
              size={48}
              style={{ color: C.success, marginBottom: 16 }}
            />
            <p
              style={{
                color: C.text,
                fontWeight: 700,
                fontSize: 20,
                marginBottom: 20,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Importação Concluída!
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                marginBottom: 24,
              }}
            >
              {[
                ["Avaliações", summary.ratings, Star],
                ["Reviews", summary.reviews, Pencil],
                ["Watchlist", summary.watchlist, Bookmark],
              ].map(([l, v, Icon]) => (
                <div
                  key={l}
                  style={{
                    background: C.bgDeep,
                    borderRadius: 12,
                    padding: "14px 20px",
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <Icon size={18} style={{ color: C.gold, marginBottom: 6 }} />
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: C.gold,
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {v}
                  </p>
                  <p style={{ fontSize: 11, color: C.textMuted }}>{l}</p>
                </div>
              ))}
            </div>
            {summary.skipped.length > 0 && (
              <div
                style={{
                  textAlign: "left",
                  background: C.bgDeep,
                  borderRadius: 12,
                  padding: 16,
                  border: `1px solid ${C.border}`,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <AlertCircle size={14} style={{ color: C.orange }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.orange }}>
                    {summary.skipped.length} filme(s) não encontrado(s)
                  </p>
                </div>
                <div style={{ maxHeight: 120, overflow: "auto" }}>
                  {summary.skipped.map((s, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        marginBottom: 2,
                      }}
                    >
                      • {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <Btn
              variant="gold"
              onClick={() => {
                onClose();
                window.location.reload();
              }}
            >
              Fechar
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PROFILE EDIT MODAL

function ProfileEditModal(props) {
  if (typeof document === "undefined") return null;
  return createPortal(<ProfileEditModalInner {...props} />, document.body);
}
function ProfileEditModalInner({ profile, user, onClose, onSave }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [avatarTab, setAvatarTab] = useState("monkeys"); // "monkeys" | "upload"
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl + "?t=" + Date.now());
      toast.success("Foto enviada!");
    } catch (err) {
      toast.error("Erro ao enviar foto: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        display_name: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });
      toast.success("Perfil atualizado!");
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "relative",
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 28,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Editar Perfil
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: C.bgDeep,
              border: `1px solid ${C.border}`,
              color: C.textMuted,
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Avatar Section */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              margin: "0 auto 16px",
              background: avatarUrl
                ? "transparent"
                : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
              border: `3px solid ${C.gold}`,
              boxShadow: `0 4px 20px rgba(201,168,76,0.3)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              fontSize: 28,
              fontWeight: 800,
              color: C.bgDeep,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              (displayName || "?").slice(0, 2).toUpperCase()
            )}
          </div>

          {/* Avatar Tab Switcher */}
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              background: C.bgDeep,
              borderRadius: 10,
              padding: 3,
              marginBottom: 16,
            }}
          >
            {[
              ["monkeys", "🐒 Macacos"],
              ["upload", "📷 Upload"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setAvatarTab(id)}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: avatarTab === id ? C.bgDeep : C.textMuted,
                  background: avatarTab === id ? C.gold : "transparent",
                  borderRadius: 8,
                  transition: "all 0.2s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {avatarTab === "monkeys" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                maxWidth: 320,
                margin: "0 auto",
              }}
            >
              {MONKEY_AVATARS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAvatarUrl(m.src)}
                  style={{
                    padding: 8,
                    borderRadius: 14,
                    border:
                      avatarUrl === m.src
                        ? `2px solid ${C.gold}`
                        : `1px solid ${C.border}`,
                    background: avatarUrl === m.src ? `${C.gold}15` : C.bgDeep,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={m.src}
                    alt={m.label}
                    loading="lazy"
                    width={64}
                    height={64}
                    style={{ borderRadius: 10 }}
                  />
                </button>
              ))}
            </div>
          )}

          {avatarTab === "upload" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                style={{ display: "none" }}
              />
              <Btn
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Spinner size={14} /> Enviando...
                  </>
                ) : (
                  "Escolher foto"
                )}
              </Btn>
              <p style={{ fontSize: 11, color: C.textDim }}>
                JPG, PNG ou WebP · máx. 2MB
              </p>
            </div>
          )}

          {avatarUrl && (
            <button
              onClick={() => setAvatarUrl("")}
              style={{
                marginTop: 8,
                fontSize: 11,
                color: C.red,
                cursor: "pointer",
                background: "none",
                border: "none",
              }}
            >
              Remover avatar
            </button>
          )}
        </div>

        {/* Fields */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <TextInput
            label="Nome de exibição"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Seu nome"
          />
          <TextInput
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="@username"
            note="Sem espaços, letras e números"
          />
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: C.textMuted,
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte sobre você..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(9,21,35,0.6)",
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.gold)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            <p style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
              {bio.length}/200
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn variant="gold" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner size={14} /> Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({
  user,
  setPage,
  isOwnProfile = true,
  auth: authCtx,
  setSelectedMovie,
  viewUserId,
}) {
  const currentUserId = authCtx?.user?.id;
  const isViewingOther = viewUserId && viewUserId !== currentUserId;
  const targetUserId = isViewingOther ? viewUserId : currentUserId;

  // For viewing other profiles, load their profile data
  const [otherProfile, setOtherProfile] = useState(null);
  useEffect(() => {
    if (!isViewingOther) {
      setOtherProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", viewUserId)
      .single()
      .then(({ data }) => setOtherProfile(data));
  }, [viewUserId, isViewingOther]);

  const profile = isViewingOther ? otherProfile : authCtx?.profile;
  const { ratings, loading: ratingsLoading } = useRatings(targetUserId);
  const {
    items: watchlistItems,
    loading: wlLoading,
    remove: removeFromWl,
  } = useWatchlist(targetUserId);
  const [tab, setTab] = useState("ratings");
  const [viewMode, setViewMode] = useState("list");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Follow hooks - currentUser for actions, targetUser for display counts
  const {
    following: myFollowing,
    follow,
    unfollow,
    isFollowing,
  } = useFollows(currentUserId);
  const { followers: targetFollowers, following: targetFollowing } =
    useFollows(targetUserId);
  const { isFriend } = useFriendships(currentUserId);

  const displayName =
    profile?.display_name ||
    (isViewingOther ? "Usuário" : authCtx?.user?.email || "Usuário");
  const initials = displayName.slice(0, 2).toUpperCase();
  const uname =
    profile?.username ||
    (!isViewingOther ? authCtx?.user?.email?.split("@")[0] : null) ||
    "user";
  const bio = profile?.bio || "";
  const avgRating =
    ratings.length > 0
      ? (
          ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length
        ).toFixed(1)
      : "—";

  // Gêneros favoritos baseados em TODAS as avaliações do usuário
  const [favGenres, setFavGenres] = useState([]);
  useEffect(() => {
    if (!ratings.length) {
      setFavGenres([]);
      return;
    }
    let alive = true;

    // Alteração: Agora utilizamos o array 'ratings' completo em vez de apenas .slice(0, 20)
    const toFetch = ratings;

    Promise.all(
      toFetch.map((r) =>
        cachedFetch(`mini_${r.tmdb_id}`, () =>
          tmdbProxy({ data: { path: `/movie/${r.tmdb_id}`, params: {} } }),
        ).catch(() => null),
      ),
    ).then((results) => {
      if (!alive) return;
      const genreCount = {};

      results.filter(Boolean).forEach((m) => {
        (m.genres || []).forEach((g) => {
          // O TMDB retorna objetos de gênero com 'name'. Verificamos para evitar erros.
          const genreName = g.name || g;
          if (genreName) {
            genreCount[genreName] = (genreCount[genreName] || 0) + 1;
          }
        });
      });

      // Ordenamos pela contagem decrescente e mantemos o Top 6 conforme solicitado
      const sorted = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      const maxCount = sorted[0]?.[1] || 1;
      setFavGenres(
        sorted.map(([name, count]) => ({
          name,
          count,
          pct: Math.round((count / maxCount) * 100),
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, [ratings]);

  // Top 3 recent posters for banner collage
  const bannerPosters = ratings
    .filter((r) => r.poster_url)
    .slice(0, 4)
    .map((r) => r.poster_url);

  return (
    <div style={{ paddingTop: 64, paddingBottom: 80, minHeight: "100vh" }}>
      {/* Cover / Banner */}
      <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
        {bannerPosters.length > 0 ? (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              position: "absolute",
              inset: 0,
            }}
          >
            {bannerPosters.map((p, i) => (
              <div key={i} style={{ flex: 1, overflow: "hidden" }}>
                <img
                  src={p}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "brightness(0.4) saturate(1.2)",
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.bgCardHover} 50%, ${C.gold}22 100%)`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, transparent 30%, #0F1923 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 40px,rgba(201,168,76,0.04) 40px,rgba(201,168,76,0.04) 41px)`,
          }}
        />
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        {/* Profile Header Card */}
        <div style={{ marginTop: -72, position: "relative", zIndex: 10 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: profile?.avatar_url
                  ? "transparent"
                  : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                border: `4px solid ${C.bgDeep}`,
                boxShadow: `0 4px 24px rgba(201,168,76,0.3)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                fontSize: 32,
                fontWeight: 800,
                color: C.bgDeep,
                fontFamily: "'Outfit', sans-serif",
                marginBottom: 14,
              }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </div>

            <h1
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: C.text,
                marginBottom: 2,
              }}
            >
              {displayName}
            </h1>
            <p
              style={{
                color: C.gold,
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              @{uname}
            </p>
            {bio && (
              <p
                style={{
                  color: C.textMuted,
                  fontSize: 13,
                  maxWidth: 380,
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}
              >
                {bio}
              </p>
            )}

            {/* Stats Row */}
            <div
              style={{
                display: "flex",
                gap: 0,
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              {[
                ["Avaliações", ratings.length, <Film size={16} />],
                [
                  "Watchlist",
                  watchlistItems.length,
                  <ClipboardList size={16} />,
                ],
                ["Nota Média", avgRating, <Star size={16} />],
                ["Seguindo", targetFollowing.length, <UserRound size={16} />],
                ["Seguidores", targetFollowers.length, <Users size={16} />],
              ].map(([label, val, icon], i, arr) => (
                <div
                  key={label}
                  style={{
                    padding: "14px 20px",
                    textAlign: "center",
                    borderRight:
                      i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 4,
                      display: "flex",
                      justifyContent: "center",
                      color: C.gold,
                    }}
                  >
                    {icon}
                  </div>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: C.gold,
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {val}
                  </p>
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Favorite Genres */}
            {favGenres.length > 0 && (
              <div style={{ width: "100%", maxWidth: 400, marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.textMuted,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Gêneros Favoritos
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {favGenres.map((g) => (
                    <div
                      key={g.name}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: C.text,
                          fontWeight: 500,
                          width: 90,
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {g.name}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: C.bgDeep,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${g.pct}%`,
                            height: "100%",
                            background: `linear-gradient(90deg, ${C.goldDim}, ${C.gold})`,
                            borderRadius: 3,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: C.textDim,
                          width: 20,
                          flexShrink: 0,
                        }}
                      >
                        {g.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {isViewingOther ? (
                <>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPage("profile");
                    }}
                  >
                    ← Voltar
                  </Btn>
                  {isFriend(viewUserId) && (
                    <Badge color="rgba(34,197,94,0.15)" textColor={C.success}>
                      Amigo
                    </Badge>
                  )}
                  <Btn
                    variant={isFollowing(viewUserId) ? "ghost" : "gold"}
                    size="sm"
                    onClick={() => {
                      if (isFollowing(viewUserId)) unfollow(viewUserId);
                      else follow(viewUserId);
                    }}
                  >
                    {isFollowing(viewUserId) ? (
                      <>
                        <UserCheckIcon /> Seguindo
                      </>
                    ) : (
                      <>
                        <UserPlusIcon /> Seguir
                      </>
                    )}
                  </Btn>
                </>
              ) : (
                <>
                  <Btn
                    variant="gold"
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Pencil size={13} /> Editar Perfil
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}?profile=${currentUserId}`;
                      navigator.clipboard
                        .writeText(url)
                        .then(() => toast.success("Link do perfil copiado!"))
                        .catch(() => toast.error("Erro ao copiar"));
                    }}
                  >
                    <Link2 size={13} /> Compartilhar Perfil
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload size={13} /> Importar Dados
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => authCtx?.signOut?.()}
                  >
                    Sair da conta
                  </Btn>
                </>
              )}
            </div>
          </div>
        </div>

        {showEditModal && !isViewingOther && (
          <ProfileEditModal
            profile={profile}
            user={authCtx?.user}
            onClose={() => setShowEditModal(false)}
            onSave={authCtx?.updateProfile}
          />
        )}

        {showImportModal && !isViewingOther && (
          <ImportDataModal
            userId={currentUserId}
            onClose={() => setShowImportModal(false)}
          />
        )}

        {/* Tabs + View Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 32,
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 4,
              background: C.bgCard,
              borderRadius: 12,
              padding: 4,
              border: `1px solid ${C.border}`,
            }}
          >
            {[
              ["ratings", "Avaliações"],
              ["watchlist", "Watchlist"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: tab === id ? C.bgDeep : C.textMuted,
                  background: tab === id ? C.gold : "transparent",
                  borderRadius: 9,
                  transition: "all 0.25s ease",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <ViewToolbar
            viewMode={viewMode}
            setViewMode={setViewMode}
            showPerPage={false}
          />
        </div>

        {/* Ratings Tab */}
        {tab === "ratings" &&
          (viewMode === "list" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ratingsLoading ? (
                <Spinner />
              ) : ratings.length > 0 ? (
                ratings.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 18,
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    className="card-hover"
                    onClick={() => {
                      setSelectedMovie?.({
                        tmdbId: r.tmdb_id,
                        title: r.title,
                        poster: r.poster_url,
                      });
                      setPage("movie");
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 84,
                        borderRadius: 10,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: C.bgDeep,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {r.poster_url && (
                        <img
                          src={r.poster_url}
                          alt={r.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.text,
                          marginBottom: 4,
                        }}
                      >
                        {r.title || `TMDb #${r.tmdb_id}`}
                      </p>
                      <StarRating value={Number(r.rating)} size={14} />
                      {r.review && (
                        <p
                          style={{
                            fontSize: 12,
                            color: C.textMuted,
                            lineHeight: 1.5,
                            fontStyle: "italic",
                            marginTop: 6,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          "{r.review}"
                        </p>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: C.textDim,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {new Date(r.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ marginBottom: 12 }}>
                    <Film size={40} style={{ color: "#4A5E72" }} />
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    Nenhuma avaliação ainda
                  </p>
                  <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>
                    Avalie filmes para construir seu histórico!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 18,
              }}
            >
              {ratingsLoading ? (
                <Spinner />
              ) : ratings.length > 0 ? (
                ratings.map((r) => (
                  <div
                    key={r.id}
                    className="movie-card-netflix"
                    style={{ position: "relative" }}
                  >
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedMovie?.({
                          tmdbId: r.tmdb_id,
                          title: r.title,
                          poster: r.poster_url,
                        });
                        setPage("movie");
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "2/3",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: C.bgCard,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {r.poster_url ? (
                          <img
                            src={r.poster_url}
                            alt={r.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                              opacity: 0.3,
                            }}
                          >
                            <Film size={32} />
                          </div>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: C.text,
                          marginTop: 8,
                          lineHeight: 1.3,
                        }}
                      >
                        {r.title}
                      </p>
                      <div style={{ marginTop: 4 }}>
                        <StarRating value={Number(r.rating)} size={12} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    gridColumn: "1/-1",
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Film size={40} style={{ color: "#4A5E72" }} />
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    Nenhuma avaliação ainda
                  </p>
                </div>
              )}
            </div>
          ))}

        {/* Watchlist Tab */}
        {tab === "watchlist" &&
          (viewMode === "grid" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 18,
              }}
            >
              {wlLoading ? (
                <Spinner />
              ) : watchlistItems.length > 0 ? (
                watchlistItems.map((item) => (
                  <div
                    key={item.id}
                    style={{ position: "relative" }}
                    className="movie-card-netflix"
                  >
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedMovie?.({
                          tmdbId: item.tmdb_id,
                          title: item.title,
                          poster: item.poster_url,
                        });
                        setPage("movie");
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "2/3",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: C.bgCard,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        {item.poster_url ? (
                          <img
                            src={item.poster_url}
                            alt={item.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                              opacity: 0.3,
                            }}
                          >
                            <Film size={32} />
                          </div>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: C.text,
                          marginTop: 8,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWl(item.tmdb_id);
                      }}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                        color: "#ef4444",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(239,68,68,0.3)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    gridColumn: "1/-1",
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <ClipboardList size={40} style={{ color: "#4A5E72" }} />
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    Sua lista está vazia
                  </p>
                  <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>
                    Adicione filmes para assistir depois!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {wlLoading ? (
                <Spinner />
              ) : watchlistItems.length > 0 ? (
                watchlistItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: C.bgCard,
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 18,
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    className="card-hover"
                    onClick={() => {
                      setSelectedMovie?.({
                        tmdbId: item.tmdb_id,
                        title: item.title,
                        poster: item.poster_url,
                      });
                      setPage("movie");
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 84,
                        borderRadius: 10,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: C.bgDeep,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {item.poster_url ? (
                        <img
                          src={item.poster_url}
                          alt={item.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            opacity: 0.3,
                          }}
                        >
                          <Film size={24} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{ fontSize: 15, fontWeight: 600, color: C.text }}
                      >
                        {item.title}
                      </p>
                      <p
                        style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}
                      >
                        Adicionado em{" "}
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWl(item.tmdb_id);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "transparent",
                        border: `1px solid ${C.border}`,
                        color: C.red,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ marginBottom: 12 }}>
                    <ClipboardList size={40} style={{ color: "#4A5E72" }} />
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    Sua lista está vazia
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

function FriendsPage({
  setPage,
  setSelectedMovie,
  auth: authCtx,
  onViewProfile,
}) {
  const userId = authCtx?.user?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tab, setTab] = useState("search"); // search | following | followers | friends
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [followerProfiles, setFollowerProfiles] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const debRef = useRef(null);

  const {
    following,
    followers,
    follow,
    unfollow,
    isFollowing,
    loading: followsLoading,
  } = useFollows(userId);
  const { friends, isFriend } = useFriendships(userId);

  // Search users
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    debRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const q = searchQuery.trim().toLowerCase();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .neq("user_id", userId)
        .limit(20);
      setSearchResults(data || []);
      setSearchLoading(false);
    }, 400);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [searchQuery, userId]);

  // Load following profiles
  useEffect(() => {
    if (!following.length) {
      setFollowingProfiles([]);
      return;
    }
    const ids = following.map((f) => f.following_id);
    supabase
      .from("profiles")
      .select("*")
      .in("user_id", ids)
      .then(({ data }) => setFollowingProfiles(data || []));
  }, [following]);

  // Load follower profiles
  useEffect(() => {
    if (!followers.length) {
      setFollowerProfiles([]);
      return;
    }
    const ids = followers.map((f) => f.follower_id);
    supabase
      .from("profiles")
      .select("*")
      .in("user_id", ids)
      .then(({ data }) => setFollowerProfiles(data || []));
  }, [followers]);

  // Load friend profiles
  useEffect(() => {
    if (!friends.length) {
      setFriendProfiles([]);
      return;
    }
    const ids = friends.map((f) =>
      f.user_a_id === userId ? f.user_b_id : f.user_a_id,
    );
    supabase
      .from("profiles")
      .select("*")
      .in("user_id", ids)
      .then(({ data }) => setFriendProfiles(data || []));
  }, [friends, userId]);

  const handleShareProfile = () => {
    const url = `${window.location.origin}?profile=${userId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link do perfil copiado!"))
      .catch(() => toast.error("Erro ao copiar"));
  };

  const getAvatarForProfile = (profile) => {
    if (profile?.avatar_url) return profile.avatar_url;
    return null;
  };

  const UserCard = ({ profile, showActions = true }) => {
    const avatarUrl = getAvatarForProfile(profile);
    const initials = (profile?.display_name || "?").slice(0, 2).toUpperCase();
    const isFollowingUser = isFollowing(profile.user_id);
    const isFriendUser = isFriend(profile.user_id);

    return (
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
          transition: "all 0.2s",
          cursor: "pointer",
        }}
        className="card-hover"
        onClick={() => onViewProfile?.(profile.user_id)}
      >
        {/* Avatar */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            flexShrink: 0,
            overflow: "hidden",
            background: avatarUrl
              ? "transparent"
              : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
            border: `2px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            color: C.bgDeep,
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: C.text,
              marginBottom: 2,
            }}
          >
            {profile.display_name || "Sem nome"}
          </p>
          {profile.username && (
            <p style={{ fontSize: 12, color: C.gold }}>@{profile.username}</p>
          )}
          {profile.bio && (
            <p
              style={{
                fontSize: 12,
                color: C.textMuted,
                marginTop: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {profile.bio}
            </p>
          )}
        </div>

        {/* Actions */}
        {showActions && profile.user_id !== userId && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {isFriendUser && (
              <Badge color="rgba(34,197,94,0.15)" textColor={C.success}>
                Amigo
              </Badge>
            )}
            <Btn
              variant={isFollowingUser ? "ghost" : "gold"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (isFollowingUser) unfollow(profile.user_id);
                else follow(profile.user_id);
              }}
            >
              {isFollowingUser ? (
                <>
                  <UserCheckIcon /> Seguindo
                </>
              ) : (
                <>
                  <UserPlusIcon /> Seguir
                </>
              )}
            </Btn>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 28px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: C.text,
              marginBottom: 6,
            }}
          >
            <span style={{ color: C.gold }}>Amigos</span> & Social
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13 }}>
            Encontre pessoas, siga e adicione amigos
          </p>
        </div>

        {/* Share Profile Section */}
        <div
          style={{
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 22,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <LinkIcon />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              Compartilhar Perfil
            </h3>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
            Envie o link do seu perfil para que amigos possam te encontrar e
            seguir.
          </p>
          <Btn variant="gold" size="sm" onClick={handleShareProfile}>
            <Link2 size={13} /> Copiar Link do Perfil
          </Btn>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            background: C.bgCard,
            borderRadius: 12,
            padding: 3,
            border: `1px solid ${C.border}`,
          }}
        >
          {[
            ["search", "Buscar"],
            ["following", `Seguindo (${following.length})`],
            ["followers", `Seguidores (${followers.length})`],
            ["friends", `Amigos (${friends.length})`],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                padding: "9px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                color: tab === id ? C.bgDeep : C.textMuted,
                background: tab === id ? C.gold : "transparent",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {tab === "search" && (
          <div>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              >
                <SearchSVG size={15} />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou username..."
                style={{
                  width: "100%",
                  padding: "14px 14px 14px 40px",
                  borderRadius: 12,
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = C.gold)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>

            {searchLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px 0",
                }}
              >
                <Spinner size={28} />
              </div>
            ) : searchResults.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {searchResults.map((p) => (
                  <UserCard key={p.id} profile={p} />
                ))}
              </div>
            ) : searchQuery ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: C.textDim,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Search size={32} style={{ color: "#4A5E72" }} />
                </div>
                <p style={{ fontSize: 14 }}>Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: C.textDim,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Users size={40} style={{ color: "#4A5E72" }} />
                </div>
                <p style={{ fontSize: 14, marginBottom: 4 }}>
                  Busque por nome ou username
                </p>
                <p style={{ fontSize: 12 }}>
                  para encontrar e seguir outros cinéfilos
                </p>
              </div>
            )}
          </div>
        )}

        {/* Following Tab */}
        {tab === "following" && (
          <div>
            {followsLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px 0",
                }}
              >
                <Spinner size={28} />
              </div>
            ) : followingProfiles.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {followingProfiles.map((p) => (
                  <UserCard key={p.id} profile={p} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: C.textDim,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <UserRound size={40} style={{ color: "#4A5E72" }} />
                </div>
                <p style={{ fontSize: 14 }}>Você ainda não segue ninguém</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Busque usuários e comece a seguir!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Followers Tab */}
        {tab === "followers" && (
          <div>
            {followsLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "40px 0",
                }}
              >
                <Spinner size={28} />
              </div>
            ) : followerProfiles.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {followerProfiles.map((p) => (
                  <UserCard key={p.id} profile={p} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: C.textDim,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <UserRound size={40} style={{ color: "#4A5E72" }} />
                </div>
                <p style={{ fontSize: 14 }}>Nenhum seguidor ainda</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Compartilhe seu perfil para ganhar seguidores!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Friends Tab */}
        {tab === "friends" && (
          <div>
            {friendProfiles.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {friendProfiles.map((p) => (
                  <UserCard key={p.id} profile={p} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: C.textDim,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Handshake size={40} style={{ color: "#4A5E72" }} />
                </div>
                <p style={{ fontSize: 14 }}>Nenhum amigo ainda</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Gere um link de amizade e envie para seus amigos!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupsPage({ setPage, setSelectedGroup, auth: authCtx }) {
  const userId = authCtx?.user?.id;
  const {
    clubs,
    loading,
    invites,
    createClub,
    joinByCode,
    acceptInvite,
    declineInvite,
  } = useClubs(userId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao seu club");
      return;
    }
    setCreating(true);
    try {
      await createClub(name.trim(), desc.trim() || null);
      toast.success("Club criado!");
      setName("");
      setDesc("");
      setShowCreate(false);
    } catch (e) {
      toast.error("Erro ao criar club");
    }
    setCreating(false);
  };
  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      let code = joinCode.trim();
      if (code.includes("club="))
        code = new URL(code).searchParams.get("club") || code;
      await joinByCode(code);
      toast.success("Você entrou no club!");
      setJoinCode("");
    } catch (e) {
      toast.error(e.message || "Erro ao entrar no club");
    }
  };
  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 30,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: C.text,
                marginBottom: 6,
              }}
            >
              Meus <span style={{ color: C.gold }}>Clubs</span>
            </h1>
            <p style={{ color: C.textMuted, fontSize: 13 }}>
              Listas colaborativas com seus amigos
            </p>
          </div>
          <Btn variant="gold" onClick={() => setShowCreate(true)}>
            <PlusIcon /> Criar Club
          </Btn>
        </div>
        {invites.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.gold,
                marginBottom: 12,
              }}
            >
              Convites Pendentes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    background: C.bgCard,
                    border: `1px solid ${C.gold}40`,
                    borderRadius: 14,
                    padding: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                      {inv.clubs?.name || "Club"}
                    </p>
                    <p style={{ fontSize: 11, color: C.textMuted }}>
                      Você foi convidado para este club
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn
                      variant="gold"
                      size="sm"
                      onClick={() => acceptInvite(inv.id, inv.club_id)}
                    >
                      Aceitar
                    </Btn>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => declineInvite(inv.id)}
                    >
                      Recusar
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div
          style={{
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <Link2 size={14} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              Entrar em um Club
            </h3>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Cole o link ou código do club..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                background: C.bgDeep,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 13,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.gold)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <Btn
              variant="gold"
              size="sm"
              onClick={handleJoin}
              disabled={!joinCode.trim()}
            >
              Entrar
            </Btn>
          </div>
        </div>
        {showCreate && (
          <div
            style={{
              background: C.bgCard,
              border: `1px solid ${C.gold}`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 22,
              animation: "fadeIn 0.2s ease",
            }}
          >
            <h3
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                color: C.text,
                marginBottom: 16,
              }}
            >
              Novo Club
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <TextInput
                label="Nome do Club"
                value={name}
                onChange={setName}
                placeholder="Ex: Cinéphiles de Sexta"
              />
              <TextInput
                label="Descrição (opcional)"
                value={desc}
                onChange={setDesc}
                placeholder="Do que se trata esse club?"
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Btn
                variant="gold"
                size="sm"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? <Spinner size={14} /> : "Criar"}
              </Btn>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </Btn>
            </div>
          </div>
        )}
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "60px 0",
            }}
          >
            <Spinner size={32} />
          </div>
        ) : clubs.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {clubs.map((club) => (
              <div
                key={club.id}
                className="card-hover"
                onClick={() => {
                  setSelectedGroup(club);
                  setPage("group");
                }}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 22,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 4,
                      }}
                    >
                      {club.name}
                    </h3>
                    <p style={{ fontSize: 12, color: C.textDim }}>
                      {club.members.length} membros · {club.movieCount} filmes
                    </p>
                  </div>
                  <div style={{ display: "flex" }}>
                    {club.members.slice(0, 3).map((m, i) => {
                      const ini = (m.profile?.display_name || "?")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <div
                          key={m.user_id}
                          style={{
                            marginLeft: i > 0 ? -8 : 0,
                            zIndex: 3 - i,
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.bgDeep,
                            background: m.profile?.avatar_url
                              ? "transparent"
                              : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                            border: `2px solid ${C.bgCard}`,
                            overflow: "hidden",
                          }}
                        >
                          {m.profile?.avatar_url ? (
                            <img
                              src={m.profile.avatar_url}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            ini
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {club.movieIds.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {club.movieIds.map((id) => (
                      <div
                        key={id}
                        style={{
                          width: 46,
                          height: 68,
                          borderRadius: 5,
                          background: C.bgDeep,
                          border: `1px solid ${C.border}`,
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <MiniPoster tmdbId={id} />
                      </div>
                    ))}
                  </div>
                )}
                {club.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      marginBottom: 10,
                    }}
                  >
                    {club.description}
                  </p>
                )}
                <span style={{ fontSize: 12, color: C.gold }}>Ver club →</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ marginBottom: 12 }}>
              <Film size={40} style={{ color: "#4A5E72" }} />
            </div>
            <p style={{ color: C.textMuted, fontSize: 15, fontWeight: 500 }}>
              Nenhum club ainda
            </p>
            <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>
              Crie um club e convide seus amigos!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  GROUP DETAIL PAGE

function GroupPage({ group, setPage, setSelectedMovie, auth: authCtx }) {
  const userId = authCtx?.user?.id;
  const clubId = group?.id;
  const { club, members, movies, loading, addMovie, removeMovie } =
    useClubDetail(clubId, userId);
  const { friends } = useFriendships(userId);
  const { inviteFriend } = useClubs(userId);
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [movieSearch, setMovieSearch] = useState("");
  const [movieResults, setMovieResults] = useState([]);
  const [movieSearchLoading, setMovieSearchLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const debRef = useRef(null);
  useEffect(() => {
    if (!showInvite || !friends.length || !userId) return;
    const friendIds = friends.map((f) =>
      f.user_a_id === userId ? f.user_b_id : f.user_a_id,
    );
    const existingMemberIds = members.map((m) => m.user_id);
    const invitableIds = friendIds.filter(
      (id) => !existingMemberIds.includes(id),
    );
    if (!invitableIds.length) {
      setFriendProfiles([]);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .in("user_id", invitableIds)
      .then(({ data }) => setFriendProfiles(data || []));
  }, [showInvite, friends, members, userId]);
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!movieSearch.trim()) {
      setMovieResults([]);
      return;
    }
    debRef.current = setTimeout(async () => {
      setMovieSearchLoading(true);
      const res = await tmdb.search(movieSearch.trim());
      setMovieResults((res?.results || []).slice(0, 10));
      setMovieSearchLoading(false);
    }, 400);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [movieSearch]);
  const handleAddMovie = async (movie) => {
    try {
      await addMovie(movie.id, movie.title, tmdb.poster(movie.poster_path));
      toast.success(`"${movie.title}" adicionado ao club!`);
    } catch (e) {
      toast.error(e.message || "Erro ao adicionar filme");
    }
  };
  const handleInvite = async (friendUserId) => {
    try {
      await inviteFriend(clubId, friendUserId);
      toast.success("Convite enviado!");
    } catch (e) {
      if (e.code === "23505") toast.info("Convite já enviado");
      else toast.error("Erro ao enviar convite");
    }
  };
  const handleCopyInviteLink = () => {
    if (!club) return;
    const url = `${window.location.origin}?club=${club.invite_code}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link do club copiado!"))
      .catch(() => toast.error("Erro ao copiar"));
  };
  if (!clubId) return null;
  const moviesByUser = {};
  movies.forEach((m) => {
    if (!moviesByUser[m.user_id]) moviesByUser[m.user_id] = [];
    moviesByUser[m.user_id].push(m);
  });
  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "60px 0",
            }}
          >
            <Spinner size={36} />
          </div>
        ) : (
          <>
            <div
              style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "26px 28px",
                marginBottom: 26,
              }}
            >
              <button
                onClick={() => setPage("groups")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: C.textMuted,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                <BackIcon /> Meus Clubs
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <h1
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 24,
                      fontWeight: 700,
                      color: C.text,
                      marginBottom: 4,
                    }}
                  >
                    {club?.name}
                  </h1>
                  {club?.description && (
                    <p
                      style={{
                        fontSize: 13,
                        color: C.textMuted,
                        marginBottom: 8,
                      }}
                    >
                      {club.description}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn
                    variant="gold"
                    size="sm"
                    onClick={() => setShowAddMovie(true)}
                  >
                    <PlusIcon /> Adicionar Filme
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInvite(true)}
                  >
                    <Users size={13} /> Convidar
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={handleCopyInviteLink}>
                    <Link2 size={13} /> Link
                  </Btn>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                {members.map((m) => {
                  const ini = (m.profile?.display_name || "?")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div
                      key={m.user_id}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: m.profile?.avatar_url
                            ? "transparent"
                            : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                          border: `2px solid ${C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          color: C.bgDeep,
                        }}
                      >
                        {m.profile?.avatar_url ? (
                          <img
                            src={m.profile.avatar_url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          ini
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>
                        {m.profile?.display_name || "Membro"}
                      </span>
                      {m.role === "owner" && (
                        <span
                          style={{
                            fontSize: 9,
                            color: C.gold,
                            fontWeight: 600,
                          }}
                        >
                          DONO
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {movies.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 40 }}
              >
                {members.map((member) => {
                  const memberMovies = moviesByUser[member.user_id] || [];
                  if (!memberMovies.length) return null;
                  const ini = (member.profile?.display_name || "?")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div key={member.user_id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          marginBottom: 16,
                          paddingBottom: 14,
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: "50%",
                            overflow: "hidden",
                            background: member.profile?.avatar_url
                              ? "transparent"
                              : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                            border: `2px solid ${C.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 700,
                            color: C.bgDeep,
                          }}
                        >
                          {member.profile?.avatar_url ? (
                            <img
                              src={member.profile.avatar_url}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            ini
                          )}
                        </div>
                        <div>
                          <h3
                            style={{
                              fontFamily: "'Outfit', sans-serif",
                              fontSize: 15,
                              fontWeight: 600,
                              color: C.text,
                              marginBottom: 2,
                            }}
                          >
                            {member.profile?.display_name || "Membro"}
                          </h3>
                          <p style={{ fontSize: 12, color: C.textMuted }}>
                            {memberMovies.length} filme
                            {memberMovies.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(130px, 1fr))",
                          gap: 16,
                        }}
                      >
                        {memberMovies.map((mv) => (
                          <div
                            key={mv.id}
                            style={{ position: "relative" }}
                            className="movie-card-netflix"
                          >
                            <div
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                setSelectedMovie({
                                  tmdbId: mv.tmdb_id,
                                  title: mv.title,
                                  poster: mv.poster_url,
                                });
                                setPage("movie");
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  aspectRatio: "2/3",
                                  borderRadius: 12,
                                  overflow: "hidden",
                                  background: C.bgCard,
                                  border: `1px solid ${C.border}`,
                                }}
                              >
                                {mv.poster_url ? (
                                  <img
                                    src={mv.poster_url}
                                    alt={mv.title}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: "100%",
                                      opacity: 0.3,
                                    }}
                                  >
                                    <Film size={32} />
                                  </div>
                                )}
                              </div>
                              <p
                                style={{
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: C.text,
                                  marginTop: 8,
                                  lineHeight: 1.3,
                                }}
                              >
                                {mv.title}
                              </p>
                            </div>
                            {mv.user_id === userId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMovie(mv.id);
                                }}
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  width: 26,
                                  height: 26,
                                  borderRadius: "50%",
                                  background: "rgba(0,0,0,0.7)",
                                  backdropFilter: "blur(4px)",
                                  color: "#ef4444",
                                  fontSize: 12,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                  cursor: "pointer",
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ marginBottom: 12 }}>
                  <Film size={40} style={{ color: "#4A5E72" }} />
                </div>
                <p
                  style={{ color: C.textMuted, fontSize: 15, fontWeight: 500 }}
                >
                  Nenhum filme adicionado ainda
                </p>
                <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>
                  Clique em "Adicionar Filme" para começar!
                </p>
              </div>
            )}
            {showAddMovie && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={() => setShowAddMovie(false)}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(4px)",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    background: C.bgCard,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 28,
                    width: "100%",
                    maxWidth: 500,
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      Adicionar Filme
                    </h3>
                    <button
                      onClick={() => setShowAddMovie(false)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: C.bgDeep,
                        border: `1px solid ${C.border}`,
                        color: C.textMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    value={movieSearch}
                    onChange={(e) => setMovieSearch(e.target.value)}
                    placeholder="Buscar filme..."
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: C.bgDeep,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      fontSize: 14,
                      outline: "none",
                      marginBottom: 16,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = C.gold)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                  {movieSearchLoading ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: 20,
                      }}
                    >
                      <Spinner size={24} />
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {movieResults.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: 12,
                            borderRadius: 10,
                            background: C.bgDeep,
                            border: `1px solid ${C.border}`,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          className="card-hover"
                          onClick={() => {
                            handleAddMovie(m);
                            setShowAddMovie(false);
                            setMovieSearch("");
                            setMovieResults([]);
                          }}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 60,
                              borderRadius: 6,
                              overflow: "hidden",
                              flexShrink: 0,
                              background: C.bgCard,
                            }}
                          >
                            {m.poster_path ? (
                              <img
                                src={tmdb.poster(m.poster_path)}
                                alt=""
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <Film size={20} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: C.text,
                              }}
                            >
                              {m.title}
                            </p>
                            <p style={{ fontSize: 11, color: C.textDim }}>
                              {m.release_date?.slice(0, 4)}
                            </p>
                          </div>
                          <PlusIcon />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {showInvite && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={() => setShowInvite(false)}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(4px)",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    background: C.bgCard,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 28,
                    width: "100%",
                    maxWidth: 500,
                    maxHeight: "80vh",
                    overflowY: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      Convidar Amigos
                    </h3>
                    <button
                      onClick={() => setShowInvite(false)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: C.bgDeep,
                        border: `1px solid ${C.border}`,
                        color: C.textMuted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    style={{
                      marginBottom: 20,
                      padding: 14,
                      borderRadius: 10,
                      background: C.bgDeep,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        marginBottom: 8,
                      }}
                    >
                      Compartilhe o link de convite:
                    </p>
                    <Btn
                      variant="gold"
                      size="sm"
                      onClick={handleCopyInviteLink}
                    >
                      <Link2 size={13} /> Copiar Link do Club
                    </Btn>
                  </div>
                  {friendProfiles.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {friendProfiles.map((fp) => {
                        const ini = (fp.display_name || "?")
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <div
                            key={fp.user_id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: 12,
                              borderRadius: 10,
                              background: C.bgDeep,
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                overflow: "hidden",
                                background: fp.avatar_url
                                  ? "transparent"
                                  : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                                border: `2px solid ${C.border}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                color: C.bgDeep,
                              }}
                            >
                              {fp.avatar_url ? (
                                <img
                                  src={fp.avatar_url}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                ini
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: C.text,
                                }}
                              >
                                {fp.display_name || "Sem nome"}
                              </p>
                              {fp.username && (
                                <p style={{ fontSize: 11, color: C.gold }}>
                                  @{fp.username}
                                </p>
                              )}
                            </div>
                            <Btn
                              variant="gold"
                              size="sm"
                              onClick={() => handleInvite(fp.user_id)}
                            >
                              Convidar
                            </Btn>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px 0",
                        color: C.textDim,
                      }}
                    >
                      <p style={{ fontSize: 13 }}>
                        Nenhum amigo disponível para convidar
                      </p>
                      <p style={{ fontSize: 11, marginTop: 4 }}>
                        Adicione amigos primeiro na aba Social
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SPLASH SCREEN

function LoginPage({ onLogin, onSignup, error }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""),
    [pass, setPass] = useState(""),
    [name, setName] = useState(""),
    [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !pass) {
      toast.error("Preencha email e senha");
      return;
    }
    if (mode === "signup" && pass.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (mode === "signup" && !name) {
      toast.error("Preencha seu nome");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await onLogin(email, pass);
      else await onSignup(email, pass, name, username);
    } catch (e) {
      /* error handled via toast in parent */
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Left Side: Branding ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${C.bgDeep} 0%, ${C.bg} 40%, rgba(201,168,76,0.08) 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            border: `1px solid rgba(201,168,76,0.08)`,
            top: "-15%",
            left: "-10%",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 350,
            height: 350,
            borderRadius: "50%",
            border: `1px solid rgba(201,168,76,0.05)`,
            bottom: "-10%",
            right: "-5%",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div
          style={{
            animation: "staggerUp 0.8s ease 0.1s both",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <img
            src={logoMain}
            alt="MovieClub Logo"
            style={{
              width: 280,
              marginBottom: 24,
              filter: "drop-shadow(0 8px 32px rgba(201,168,76,0.25))",
            }}
          />
        </div>

        {/* Text logo */}
        <div
          style={{
            animation: "staggerUp 0.8s ease 0.3s both",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <img
            src={logoText}
            alt="MOVIECLUB"
            style={{
              width: 320,
              marginBottom: 16,
              filter: "drop-shadow(0 4px 16px rgba(201,168,76,0.2))",
            }}
          />
          <p
            style={{
              color: C.goldLight,
              fontSize: 13,
              letterSpacing: "0.35em",
              fontWeight: 300,
              opacity: 0.7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            SHARED FILM PLATFORM
          </p>
        </div>

        {/* Mascots */}
        <div
          style={{
            animation: "staggerUp 0.8s ease 0.5s both",
            marginTop: 40,
            position: "relative",
            zIndex: 1,
          }}
        >
          <img
            src={mascotsNav}
            alt="MovieClub Mascots"
            loading="lazy"
            style={{
              width: 320,
              opacity: 0.85,
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))",
            }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            animation: "staggerUp 0.8s ease 0.7s both",
            color: C.textMuted,
            fontSize: 14,
            marginTop: 32,
            maxWidth: 300,
            textAlign: "center",
            lineHeight: 1.6,
            fontFamily: "'DM Sans', sans-serif",
            position: "relative",
            zIndex: 1,
          }}
        >
          Descubra, avalie e compartilhe filmes com seus amigos em um só lugar.
        </p>
      </div>

      {/* ── Right Side: Form ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(180deg, ${C.bgCard} 0%, ${C.bgDeep} 100%)`,
          borderLeft: `1px solid ${C.border}`,
          position: "relative",
        }}
      >
        {/* Subtle glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 70% 50% at 50% 30%, rgba(201,168,76,0.04) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            width: 400,
            position: "relative",
            zIndex: 1,
            padding: "0 24px",
          }}
        >
          {/* Welcome heading */}
          <div
            style={{
              marginBottom: 32,
              animation: "staggerUp 0.6s ease 0.2s both",
            }}
          >
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 28,
                color: C.text,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h2>
            <p style={{ color: C.textMuted, fontSize: 14 }}>
              {mode === "login"
                ? "Entre para continuar sua jornada cinematográfica"
                : "Junte-se ao clube e descubra novos filmes"}
            </p>
          </div>

          {/* Toggle */}
          <div
            style={{
              display: "flex",
              marginBottom: 28,
              background: "rgba(9,21,35,0.6)",
              borderRadius: 12,
              padding: 3,
              animation: "staggerUp 0.6s ease 0.3s both",
            }}
          >
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background:
                    mode === m
                      ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
                      : "transparent",
                  color: mode === m ? C.bgDeep : C.textMuted,
                  border: "none",
                  transition: "all 0.25s",
                }}
              >
                {m === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              animation: "staggerUp 0.5s ease 0.4s both",
            }}
          >
            {mode === "signup" && (
              <>
                <TextInput
                  label="Nome"
                  value={name}
                  onChange={setName}
                  placeholder="Seu nome"
                />
                <TextInput
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="@username"
                />
              </>
            )}
            <TextInput
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="voce@email.com"
              type="email"
            />
            <TextInput
              label="Senha"
              value={pass}
              onChange={setPass}
              placeholder="••••••••"
              type="password"
            />
          </div>

          {mode === "login" && (
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button
                style={{
                  color: C.gold,
                  fontSize: 12,
                  fontWeight: 500,
                  opacity: 0.8,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          {error && (
            <p
              style={{
                color: C.red,
                fontSize: 13,
                textAlign: "center",
                marginTop: 12,
                marginBottom: -8,
              }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-gold-shimmer"
            style={{
              width: "100%",
              marginTop: 24,
              padding: "14px",
              color: C.bgDeep,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.06em",
              transition: "transform 0.15s, box-shadow 0.2s",
              boxShadow: "0 4px 20px rgba(201,168,76,0.25)",
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(201,168,76,0.35)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(201,168,76,0.25)";
            }}
          >
            {loading
              ? "Carregando..."
              : mode === "login"
                ? "Entrar"
                : "Criar Conta"}
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0",
            }}
          >
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span
              style={{ color: C.textDim, fontSize: 11, whiteSpace: "nowrap" }}
            >
              ou continue com
            </span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Social */}
          <div
            style={{
              display: "flex",
              gap: 10,
              animation: "staggerUp 0.5s ease 0.5s both",
            }}
          >
            {["Google", "Apple"].map((p) => (
              <button
                key={p}
                onClick={onLogin}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  background: "rgba(9,21,35,0.5)",
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.goldDim;
                  e.currentTarget.style.color = C.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.textMuted;
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FilmStripBg />
    </div>
  );
}

// ─────────────────────────────────────────────
//  QUICK RATE PAGE (Tinder-style)

function QuickRatePage({ setPage, setSelectedMovie, auth }) {
  const [mode, setMode] = useState(null); // null = setup, "random" | "recommended" | "summary"
  const [movies, setMovies] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [dragStartX, setDragStartX] = useState(null);
  const [swipeX, setSwipeX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(null);
  const { ratings, upsertRating, getRating } = useRatings(auth?.user?.id);
  const {
    items: wl,
    add: addWl,
    remove: removeWl,
    isInList: inWl,
  } = useWatchlist(auth?.user?.id);
  const containerRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const recPageRef = useRef(0);
  // Session stats
  const [sessionStats, setSessionStats] = useState({
    rated: [],
    watchlistAdded: [],
    skipped: 0,
    startTime: null,
  });

  // Load random movies
  const loadRandom = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const rp = Math.floor(Math.random() * 20) + 1;
      const [pop, top, trend] = await Promise.all([
        tmdb.popular(rp),
        tmdb.topRated(Math.floor(Math.random() * 10) + 1),
        tmdb.trending(Math.floor(Math.random() * 5) + 1),
      ]);
      const all = [
        ...(pop?.results || []),
        ...(top?.results || []),
        ...(trend?.results || []),
      ];
      const unique = [];
      const seen = new Set();
      for (const m of all) {
        if (!seen.has(m.id) && m.poster_path) {
          seen.add(m.id);
          unique.push(m);
        }
      }
      for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
      }
      if (append)
        setMovies((prev) => [
          ...prev,
          ...unique.filter((u) => !prev.some((p) => p.id === u.id)),
        ]);
      else {
        setMovies(unique);
        setIdx(0);
      }
    } catch {
      toast.error("Erro ao carregar filmes");
    }
    setLoading(false);
  }, []);

  // Load recommended movies (infinite)
  const loadRecommended = useCallback(
    async (append = false) => {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoading(true);
      try {
        if (!ratings.length) {
          // Fallback: use popular if no ratings yet
          await loadRandom(append);
          loadingMoreRef.current = false;
          return;
        }

        // 1. Calcula a nota média do usuário
        const userAverage =
          ratings.reduce((sum, r) => sum + Number(r.rating), 0) /
          ratings.length;

        // 2. Considera TODOS os filmes avaliados acima/igual à média
        let seeds = ratings
          .filter((r) => Number(r.rating) >= userAverage)
          .sort((a, b) => Number(b.rating) - Number(a.rating));

        // Fallback de segurança se todos tiverem a mesma nota
        if (!seeds.length) {
          seeds = [...ratings].sort(
            (a, b) => Number(b.rating) - Number(a.rating),
          );
        }

        const ratedIds = new Set(ratings.map((r) => r.tmdb_id));
        const page = recPageRef.current;

        // Janela rotativa: a cada página percorremos uma fatia diferente das seeds
        // garantindo que com o tempo TODOS os filmes acima da média sejam usados.
        const WINDOW = 8;
        const total = seeds.length;
        const start = (page * WINDOW) % total;
        const seedMovies = [];
        for (let i = 0; i < Math.min(WINDOW, total); i++) {
          seedMovies.push(seeds[(start + i) % total]);
        }

        const maxRating = Math.max(
          ...seedMovies.map((s) => Number(s.rating)),
          1,
        );

        const results = await Promise.all(
          seedMovies.map((r) =>
            tmdb
              .get(`/movie/${r.tmdb_id}/recommendations`, {
                page: String((page % 3) + 1),
              })
              .then((res) => ({ res, weight: Number(r.rating) / maxRating }))
              .catch(() => null),
          ),
        );

        // Scoring ponderado pela nota da seed e pela popularidade do candidato
        const scoreMap = new Map();
        for (const item of results) {
          if (!item?.res?.results) continue;
          for (const raw of item.res.results) {
            if (!raw.poster_path || ratedIds.has(raw.id)) continue;
            const inc = item.weight * (1 + (raw.vote_average || 0) / 10);
            const prev = scoreMap.get(raw.id);
            if (prev) prev.score += inc;
            else scoreMap.set(raw.id, { movie: raw, score: inc });
          }
        }
        const unique = Array.from(scoreMap.values())
          .sort((a, b) => b.score - a.score)
          .map((x) => x.movie);

        recPageRef.current = page + 1;

        if (append) {
          setMovies((prev) => {
            const existIds = new Set(prev.map((p) => p.id));
            return [...prev, ...unique.filter((u) => !existIds.has(u.id))];
          });
        } else {
          setMovies(unique);
          setIdx(0);
        }
      } catch {
        toast.error("Erro ao carregar recomendações");
      }
      setLoading(false);
      loadingMoreRef.current = false;
    },
    [ratings, loadRandom],
  );


  // Start session
  const startSession = (m) => {
    setMode(m);
    recPageRef.current = 0;
    setSessionStats({
      rated: [],
      watchlistAdded: [],
      skipped: 0,
      startTime: Date.now(),
    });
    if (m === "random") loadRandom();
    else loadRecommended();
  };

  // Auto-load more when nearing end
  useEffect(() => {
    if (!mode || loading) return;
    if (idx >= movies.length - 3) {
      if (mode === "random") loadRandom(true);
      else loadRecommended(true);
    }
  }, [idx, movies.length, mode, loading]);

  const current = movies[idx];
  const existingRating = current ? getRating(current.id) : null;
  const [localRating, setLocalRating] = useState(0);

  useEffect(() => {
    if (existingRating) setLocalRating(existingRating.rating);
    else setLocalRating(0);
  }, [idx, existingRating?.rating]);

  const handleRate = async (stars) => {
    if (!current || !auth?.user) return;
    setLocalRating(stars);
    try {
      await upsertRating(
        current.id,
        stars,
        null,
        current.title,
        tmdb.poster(current.poster_path),
      );
      setSessionStats((prev) => {
        const exists = prev.rated.find((r) => r.id === current.id);
        if (exists)
          return {
            ...prev,
            rated: prev.rated.map((r) =>
              r.id === current.id ? { ...r, stars } : r,
            ),
          };
        return {
          ...prev,
          rated: [
            ...prev.rated,
            {
              id: current.id,
              title: current.title,
              poster: tmdb.poster(current.poster_path),
              stars,
            },
          ],
        };
      });
      toast.success(
        `${stars} estrela${stars !== 1 ? "s" : ""} para ${current.title}`,
      );
    } catch {
      toast.error("Erro ao avaliar");
    }
  };

  const goNext = () => {
    if (idx < movies.length - 1) {
      setDirection("left");
      setAnimating(true);
      setTimeout(() => {
        setIdx((i) => i + 1);
        setAnimating(false);
        setDirection(null);
        setSwipeX(0);
      }, 250);
    }
  };

  const goPrev = () => {
    if (idx > 0) {
      setDirection("right");
      setAnimating(true);
      setTimeout(() => {
        setIdx((i) => i - 1);
        setAnimating(false);
        setDirection(null);
        setSwipeX(0);
      }, 250);
    }
  };

  const handleOpenMovie = () => {
    if (!current) return;
    setSelectedMovie({
      tmdbId: current.id,
      title: current.title,
      poster: tmdb.poster(current.poster_path),
    });
    setPage("movie");
  };

  const onPointerDown = (e) => {
    setDragStartX(e.clientX);
  };
  const onPointerMove = (e) => {
    if (dragStartX !== null) setSwipeX(e.clientX - dragStartX);
  };
  const onPointerUp = () => {
    if (dragStartX !== null) {
      if (swipeX < -80) goNext();
      else if (swipeX > 80) goPrev();
      else setSwipeX(0);
      setDragStartX(null);
    }
  };

  useEffect(() => {
    if (!mode) return;
    const fn = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [idx, movies.length, mode]);

  // ── SETUP SCREEN ──
  if (!mode) {
    const hasRatings = ratings.length > 0;
    return (
      <div
        style={{
          paddingTop: 80,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 480, width: "100%", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`,
                border: `1px solid ${C.gold}33`,
                marginBottom: 16,
              }}
            >
              <Zap size={28} style={{ color: C.gold }} />
            </div>
            <h1
              style={{
                color: C.text,
                fontSize: 26,
                fontWeight: 800,
                margin: "0 0 8px",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Avaliação Rápida
            </h1>
            <p
              style={{
                color: C.textMuted,
                fontSize: 14,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Escolha como quer descobrir filmes nesta sessão
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Random option */}
            <button
              onClick={() => startSession("random")}
              style={{
                padding: 24,
                borderRadius: 16,
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                display: "flex",
                gap: 20,
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.gold;
                e.currentTarget.style.background = C.bgCardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = C.bgCard;
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "rgba(99,102,241,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Film size={24} style={{ color: "#818CF8" }} />
              </div>
              <div>
                <h3
                  style={{
                    color: C.text,
                    fontSize: 16,
                    fontWeight: 700,
                    margin: "0 0 4px",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Aleatório
                </h3>
                <p
                  style={{
                    color: C.textMuted,
                    fontSize: 13,
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  Filmes populares, em alta e bem avaliados misturados
                  aleatoriamente
                </p>
              </div>
            </button>

            {/* Recommended option */}
            <button
              onClick={() => startSession("recommended")}
              style={{
                padding: 24,
                borderRadius: 16,
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                display: "flex",
                gap: 20,
                alignItems: "center",
                opacity: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.gold;
                e.currentTarget.style.background = C.bgCardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = C.bgCard;
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: `${C.gold}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Target size={24} style={{ color: C.gold }} />
              </div>
              <div>
                <h3
                  style={{
                    color: C.text,
                    fontSize: 16,
                    fontWeight: 700,
                    margin: "0 0 4px",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Recomendados
                </h3>
                <p
                  style={{
                    color: C.textMuted,
                    fontSize: 13,
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {hasRatings
                    ? "Baseado nos filmes que você já avaliou — sessão infinita de descobertas"
                    : "Avalie alguns filmes primeiro para desbloquear recomendações personalizadas (usaremos populares enquanto isso)"}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUMMARY SCREEN ──
  if (mode === "summary") {
    const elapsed = sessionStats.startTime
      ? Math.round((Date.now() - sessionStats.startTime) / 60000)
      : 0;
    const avgRating =
      sessionStats.rated.length > 0
        ? (
            sessionStats.rated.reduce((sum, r) => sum + r.stars, 0) /
            sessionStats.rated.length
          ).toFixed(1)
        : "0";
    const totalViewed = idx + 1;
    const distribution = [1, 2, 3, 4, 5].map(
      (s) => sessionStats.rated.filter((r) => Math.ceil(r.stars) === s).length,
    );
    const maxDist = Math.max(...distribution, 1);

    return (
      <div
        style={{
          paddingTop: 80,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 500, width: "100%", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`,
                border: `1px solid ${C.gold}33`,
                marginBottom: 16,
              }}
            >
              <Award size={28} style={{ color: C.gold }} />
            </div>
            <h1
              style={{
                color: C.text,
                fontSize: 24,
                fontWeight: 800,
                margin: "0 0 6px",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Sessão Finalizada
            </h1>
            <p style={{ color: C.textMuted, fontSize: 13 }}>
              {elapsed > 0
                ? `${elapsed} minuto${elapsed !== 1 ? "s" : ""} de sessão`
                : "Menos de um minuto"}
            </p>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {[
              [sessionStats.rated.length, "Avaliados", Star, C.gold],
              [
                sessionStats.watchlistAdded.length,
                "Na Watchlist",
                Bookmark,
                "#22C55E",
              ],
              [totalViewed, "Visualizados", Eye, "#818CF8"],
            ].map(([val, label, Icon, color], i) => (
              <div
                key={i}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  textAlign: "center",
                }}
              >
                <Icon size={18} style={{ color, marginBottom: 6 }} />
                <div
                  style={{
                    color: C.text,
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {val}
                </div>
                <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Average + Distribution */}
          {sessionStats.rated.length > 0 && (
            <div
              style={{
                padding: 20,
                borderRadius: 16,
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}
                >
                  Nota Média
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size={16} fill={C.gold} stroke={C.gold} />
                  <span
                    style={{
                      color: C.gold,
                      fontSize: 20,
                      fontWeight: 800,
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {avgRating}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                  height: 60,
                }}
              >
                {distribution.map((count, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        borderRadius: 4,
                        height: Math.max((count / maxDist) * 48, 4),
                        background:
                          count > 0
                            ? `linear-gradient(to top, ${C.gold}, ${C.goldLight})`
                            : C.border,
                        transition: "height 0.3s",
                      }}
                    />
                    <span style={{ fontSize: 10, color: C.textMuted }}>
                      {i + 1}
                      <Star size={8} style={{ marginLeft: 1 }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rated movies list */}
          {sessionStats.rated.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3
                style={{
                  color: C.text,
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 12,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Filmes Avaliados
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 240,
                  overflowY: "auto",
                }}
              >
                {sessionStats.rated.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${C.border}`,
                    }}
                    onClick={() => {
                      setSelectedMovie({
                        tmdbId: r.id,
                        title: r.title,
                        poster: r.poster,
                      });
                      setPage("movie");
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = C.borderHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = C.border)
                    }
                    style_={{ cursor: "pointer" }}
                  >
                    {r.poster && (
                      <img
                        src={r.poster}
                        alt=""
                        style={{
                          width: 32,
                          height: 48,
                          borderRadius: 6,
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <span
                      style={{
                        flex: 1,
                        color: C.text,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setSelectedMovie({
                          tmdbId: r.id,
                          title: r.title,
                          poster: r.poster,
                        });
                        setPage("movie");
                      }}
                    >
                      {r.title}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      <Star size={12} fill={C.gold} stroke={C.gold} />
                      <span
                        style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}
                      >
                        {r.stars}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn variant="outline" onClick={() => setMode(null)}>
              Nova Sessão
            </Btn>
            <Btn variant="gold" onClick={() => setPage("home")}>
              Voltar ao Início
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (loading && movies.length === 0)
    return (
      <div
        style={{
          paddingTop: 100,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Spinner size={36} />
        <p style={{ color: C.textMuted, fontSize: 14 }}>
          Preparando sessão{mode === "recommended" ? " personalizada" : ""}...
        </p>
      </div>
    );

  if (!current)
    return (
      <div
        style={{
          paddingTop: 100,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Film size={48} style={{ color: C.textDim }} />
        <p style={{ color: C.textMuted, fontSize: 14 }}>
          Nenhum filme encontrado
        </p>
        <Btn variant="gold" onClick={() => setMode(null)}>
          Voltar
        </Btn>
      </div>
    );

  const posterUrl = tmdb.poster(current.poster_path, "w500");
  const backdropUrl = tmdb.backdrop(current.backdrop_path);
  const year = current.release_date?.slice(0, 4);
  const cardTransform = animating
    ? direction === "left"
      ? "translateX(-120%) rotate(-8deg)"
      : "translateX(120%) rotate(8deg)"
    : `translateX(${swipeX}px) rotate(${swipeX * 0.04}deg)`;

  return (
    <div
      style={{
        paddingTop: 80,
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {backdropUrl && (
        <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
          <img
            src={backdropUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.15,
              filter: "blur(30px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(to bottom, ${C.bg}dd, ${C.bg})`,
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 500,
          margin: "0 auto",
          padding: "20px 20px 40px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setMode(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.textMuted,
                display: "flex",
                alignItems: "center",
                padding: 4,
                borderRadius: 8,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
            >
              <ChevronLeft size={20} />
            </button>
            {mode === "recommended" ? (
              <Target size={18} style={{ color: C.gold }} />
            ) : (
              <Film size={18} style={{ color: "#818CF8" }} />
            )}
            <span
              style={{
                color: C.text,
                fontWeight: 700,
                fontSize: 16,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {mode === "recommended" ? "Recomendados" : "Aleatório"}
            </span>
          </div>
          <span style={{ color: C.textDim, fontSize: 12 }}>
            {idx + 1} / {movies.length}
            {mode === "recommended" ? "+" : ""}
          </span>
        </div>

        {/* Movie Card */}
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ touchAction: "pan-y", userSelect: "none" }}
        >
          <div
            style={{
              transform: cardTransform,
              transition: animating
                ? "transform 0.25s ease-out, opacity 0.25s"
                : dragStartX
                  ? "none"
                  : "transform 0.2s ease-out",
              opacity: animating ? 0 : 1,
            }}
          >
            <div
              onClick={handleOpenMovie}
              style={{
                cursor: "pointer",
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
                aspectRatio: "2/3",
                width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                border: `1px solid ${C.border}`,
              }}
            >
              <img
                src={posterUrl}
                alt={current.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "50%",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "20px 24px",
                }}
              >
                <h2
                  style={{
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 800,
                    margin: 0,
                    lineHeight: 1.2,
                    fontFamily: "'DM Sans', sans-serif",
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  }}
                >
                  {current.title}
                </h2>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  {year && (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {year}
                    </span>
                  )}
                  {current.vote_average > 0 && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: C.gold,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <Star size={13} fill={C.gold} />{" "}
                      {current.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 11,
                    marginTop: 8,
                  }}
                >
                  Toque para ver detalhes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation + Stars */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 20,
          }}
        >
          <button
            onClick={goPrev}
            disabled={idx === 0}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: idx > 0 ? "rgba(255,255,255,0.08)" : "transparent",
              border: `1px solid ${idx > 0 ? C.border : "transparent"}`,
              color: idx > 0 ? C.text : C.textDim,
              cursor: idx > 0 ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            <ChevronLeft size={22} />
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const filled = s <= (hoverStar || localRating);
              const half = !filled && s - 0.5 === (hoverStar || localRating);
              return (
                <button
                  key={s}
                  onClick={() => handleRate(s === localRating ? s - 0.5 : s)}
                  onMouseEnter={() => setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    transform: filled || half ? "scale(1.15)" : "scale(1)",
                    transition: "all 0.15s",
                  }}
                >
                  <Star
                    size={28}
                    fill={
                      filled ? C.gold : half ? `url(#halfGrad)` : "transparent"
                    }
                    stroke={filled || half ? C.gold : C.textDim}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
            <svg width="0" height="0">
              <defs>
                <linearGradient id="halfGrad">
                  <stop offset="50%" stopColor={C.gold} />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <button
            onClick={goNext}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.08)",
              border: `1px solid ${C.border}`,
              color: C.text,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Watchlist + Skip + Finish */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            marginTop: 16,
          }}
        >
          <Btn
            variant={inWl(current.id) ? "gold" : "outline"}
            size="sm"
            onClick={async () => {
              if (inWl(current.id)) {
                await removeWl(current.id);
                setSessionStats((prev) => ({
                  ...prev,
                  watchlistAdded: prev.watchlistAdded.filter(
                    (id) => id !== current.id,
                  ),
                }));
                toast.success("Removido da watchlist");
              } else {
                await addWl(
                  current.id,
                  current.title,
                  tmdb.poster(current.poster_path),
                );
                setSessionStats((prev) => ({
                  ...prev,
                  watchlistAdded: [...prev.watchlistAdded, current.id],
                }));
                toast.success("Adicionado à watchlist");
              }
            }}
          >
            <Bookmark size={14} fill={inWl(current.id) ? C.gold : "none"} />
            {inWl(current.id) ? "Na Watchlist" : "Watchlist"}
          </Btn>
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => {
              setSessionStats((prev) => ({
                ...prev,
                skipped: prev.skipped + 1,
              }));
              goNext();
            }}
          >
            Pular <ChevronRight size={14} />
          </Btn>
        </div>

        {/* Session counter bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            marginTop: 20,
            padding: "12px 20px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={13} style={{ color: C.gold }} />
            <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
              {sessionStats.rated.length}
            </span>
            <span style={{ color: C.textDim, fontSize: 11 }}>avaliados</span>
          </div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Bookmark size={13} style={{ color: C.gold }} />
            <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
              {sessionStats.watchlistAdded.length}
            </span>
            <span style={{ color: C.textDim, fontSize: 11 }}>na lista</span>
          </div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <Btn
            variant="outline"
            size="sm"
            onClick={() => setMode("summary")}
            style={{ fontSize: 11, padding: "4px 12px" }}
          >
            <Award size={13} /> Finalizar
          </Btn>
        </div>

        <p
          style={{
            textAlign: "center",
            color: C.textDim,
            fontSize: 11,
            marginTop: 12,
          }}
        >
          Arraste para os lados ou use as setas ← → para navegar
        </p>
      </div>
    </div>
  );
}



export {
  SettingsPage, HomePage, MoviePage, SearchPage,
  ImportDataModal, ProfileEditModal, ProfilePage, FriendsPage,
  GroupsPage, GroupPage, LoginPage, QuickRatePage,
};
