// @ts-nocheck
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  C, MOCK_REVIEWS, MOCK_USERS,
} from "../foundation";
import { UserRound } from "lucide-react";
import {
  Spinner, StarRating, Avatar, Badge, Btn, Section,
  StreamingBadges, RatingsRow,
  BackIcon, PlusIcon, CheckIcon, HeartIcon, PlayIcon,
} from "../ui";
import { useMovieDetails, useRatings, useWatchlist } from "../hooks";

export function MoviePage({ movieInit, setPage, setSelectedMovie, auth: authCtx }) {
  const { movie, loading, streamServices } = useMovieDetails(movieInit?.tmdbId || movieInit?.id);
  const m = movie || movieInit;
  const [liked, setLiked] = useState(false);
  const [review, setReview] = useState("");
  const { upsertRating, getRating } = useRatings(authCtx?.user?.id);
  const { isInList, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist(authCtx?.user?.id);
  const existingRating = m ? getRating(m.tmdbId || m.id) : null;
  const [localRating, setLocalRating] = useState(0);
  const inWatchlist = m ? isInList(m.tmdbId || m.id) : false;

  useEffect(() => {
    if (existingRating) { setLocalRating(Number(existingRating.rating)); setReview(existingRating.review || ""); }
  }, [existingRating]);

  if (loading && !m)
    return (
      <div style={{ paddingTop: 80, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Spinner size={38} />
          <p style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Carregando…</p>
        </div>
      </div>
    );
  if (!m) return null;

  const reviews = MOCK_REVIEWS.filter((r) => r.movieTmdbId === m.tmdbId).map(
    (r) => ({ ...r, user: MOCK_USERS.find((u) => u.id === r.userId) })
  );

  return (
    <div style={{ paddingTop: 60, paddingBottom: 60, minHeight: "100vh" }}>
      <div style={{ height: 420, position: "relative", overflow: "hidden" }}>
        {m.backdrop ? (
          <img src={m.backdrop} alt="" className="hero-backdrop" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg,#0a1e34,#1a2d48)` }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, transparent 30%, ${C.bg} 100%)` }} />
        <button
          onClick={() => setPage("home")}
          style={{ position: "absolute", top: 20, left: 28, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(9,21,35,0.7)", color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 13, zIndex: 1 }}
        >
          <BackIcon /> Voltar
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "-200px auto 0", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 32, marginBottom: 40, alignItems: "flex-end" }}>
          <div style={{ width: 200, height: 300, borderRadius: 14, flexShrink: 0, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: `2px solid ${C.border}`, background: C.bgCard }}>
            {m.poster && <img src={m.posterHD || m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {(m.genres?.length ? m.genres : [m.genre]).slice(0, 4).map((g) => (
                <Badge key={g} color="rgba(201,168,76,0.10)" textColor={C.goldDim}>{g}</Badge>
              ))}
              {m.rated && <Badge color={C.bgCard} textColor={C.textDim}>{m.rated}</Badge>}
              {m.year && <Badge color={C.bgCard} textColor={C.textDim}>{m.year}</Badge>}
              {m.runtime && <Badge color={C.bgCard} textColor={C.textDim}>{m.runtime} min</Badge>}
            </div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 900, color: C.text, marginBottom: 4, lineHeight: 1.15 }}>
              {m.title}
            </h1>
            {m.tagline && <p style={{ color: C.gold, fontSize: 13, fontStyle: "italic", marginBottom: 14 }}>"{m.tagline}"</p>}
            <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
              {m.director && <div><span style={{ fontSize: 10, color: C.textDim, display: "block" }}>Direção</span><span style={{ fontSize: 13, color: C.textMuted }}>{m.director}</span></div>}
              {m.writer && <div><span style={{ fontSize: 10, color: C.textDim, display: "block" }}>Roteiro</span><span style={{ fontSize: 13, color: C.textMuted }}>{m.writer.split(",")[0]}</span></div>}
            </div>
            <div style={{ marginBottom: 16 }}>
              {loading && !m.imdbRating ? (
                <div style={{ display: "flex", gap: 8 }}>{[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ width: 72, height: 62, borderRadius: 10 }} />)}</div>
              ) : <RatingsRow movie={m} />}
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: C.textDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>Onde Assistir no Brasil</p>
              <StreamingBadges services={streamServices} loading={loading && !streamServices.length} />
            </div>
            {(m.awards || m.boxOffice) && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {m.awards && (
                  <div style={{ background: "rgba(201,168,76,0.06)", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 8, padding: "6px 12px" }}>
                    <p style={{ fontSize: 10, color: C.goldDim, marginBottom: 2 }}>Prêmios</p>
                    <p style={{ fontSize: 12, color: C.gold }}>{m.awards}</p>
                  </div>
                )}
                {m.boxOffice && (
                  <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px" }}>
                    <p style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>Bilheteria</p>
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
                {inWatchlist ? <><CheckIcon /> Na Watchlist</> : <><PlusIcon /> Minha Lista</>}
              </Btn>
              <Btn variant="ghost" onClick={() => setLiked((l) => !l)}>
                <HeartIcon f={liked} /> Curtir
              </Btn>
              {m.trailer && (
                <a href={`https://youtube.com/watch?v=${m.trailer}`} target="_blank" rel="noopener noreferrer">
                  <Btn variant="ghost"><PlayIcon /> Trailer</Btn>
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 28 }}>
          <div>
            <Section title="Sua Avaliação">
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>
                  {existingRating ? `Sua nota: ${Number(existingRating.rating).toFixed(1)} ★` : "Clique nas estrelas para avaliar"}
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
                      await upsertRating(tmdbId, val, review, m.title, m.poster);
                      toast.success(existingRating ? "Avaliação atualizada!" : "Avaliação publicada!");
                    } catch (e) { toast.error("Erro ao salvar avaliação"); }
                  }}
                />
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Escreva sua review (opcional)…"
                  rows={3}
                  style={{ width: "100%", marginTop: 12, padding: "10px 14px", borderRadius: 8, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, resize: "vertical", outline: "none" }}
                  onBlur={async () => {
                    if (localRating > 0 && review !== (existingRating?.review || "")) {
                      const tmdbId = m.tmdbId || m.id;
                      await upsertRating(tmdbId, localRating, review, m.title, m.poster).catch(() => {});
                    }
                  }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {existingRating && (
                    <Btn variant="ghost" size="sm" onClick={async () => {
                      await supabase.from("ratings").delete().eq("id", existingRating.id);
                      setLocalRating(0); setReview("");
                      toast.success("Avaliação removida");
                    }}>
                      Remover avaliação
                    </Btn>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Sinopse">
              <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.8 }}>{m.plot || m.overview}</p>
            </Section>

            {m.cast?.length > 0 && (
              <Section title="Elenco Principal">
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                  {m.cast.map((actor) => (
                    <div key={actor.id} style={{ textAlign: "center", flexShrink: 0, width: 78 }}>
                      <div style={{ width: 66, height: 66, borderRadius: "50%", overflow: "hidden", margin: "0 auto 6px", background: C.bgCard, border: `2px solid ${C.border}` }}>
                        {actor.photo ? (
                          <img src={actor.photo} alt={actor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: 0.4 }}>
                            <UserRound size={20} />
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.2 }}>{actor.name}</p>
                      <p style={{ fontSize: 10, color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 78 }}>{actor.character}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Reviews da Comunidade">
              {reviews.map((r, i) => (
                <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar user={r.user} size={34} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.user?.name}</p>
                        <p style={{ fontSize: 11, color: C.textDim }}>{r.date}</p>
                      </div>
                    </div>
                    <StarRating value={r.rating} size={13} />
                  </div>
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, fontStyle: "italic" }}>"{r.text}"</p>
                </div>
              ))}
              {reviews.length === 0 && <p style={{ color: C.textDim, textAlign: "center", padding: 40 }}>Nenhuma review ainda.</p>}
            </Section>
          </div>

          <div>
            {[{ title: "Similares", data: m.similar }, { title: "Recomendados", data: m.recommendations }].map(({ title, data }) =>
              data?.length > 0 ? (
                <Section key={title} title={title}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        onClick={() => { setSelectedMovie(s); setPage("movie"); }}
                        style={{ display: "flex", gap: 10, cursor: "pointer", padding: 8, borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, transition: "all 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.background = C.bgCardHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bgCard; }}
                      >
                        <div style={{ width: 44, height: 66, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: C.bgDeep }}>
                          {s.poster && <img src={s.poster} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 2 }}>{s.title}</p>
                          <p style={{ fontSize: 11, color: C.textDim }}>{s.year}</p>
                          {s.rating && <p style={{ fontSize: 11, color: C.gold }}>★ {s.rating}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
