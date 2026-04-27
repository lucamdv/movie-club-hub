// @ts-nocheck
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { toast } from "sonner";
import {
  C,
  MONKEY_AVATARS,
  tmdb,
  omdb,
  streaming,
  normalizeTmdb,
  mergeOmdb,
  STREAM_META,
  parseStreamingServices,
  cachedFetch,
  isUpcoming,
  formatReleaseDateBR,
  logoMain,
  mascotsNav,
  logoText,
  mascotWizard,
  mascotSpeak,
  mascotSee,
  monkeyDirector,
  monkeyPopcorn,
  monkeyDetective,
  monkeyStar,
  monkeyAstronaut,
  monkeyGym,
  monkeyEars,
  monkeyStrong,
  monkeyShy,
  monkeyFlash,
  monkeyCrew,
  monkeySearch,
} from "./foundation";
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
import { useMovieDetails } from "./hooks";

const Spinner = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10" stroke={C.border} strokeWidth="3" />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke={C.gold}
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const SkeletonCard = ({ w = 160 }) => (
  <div
    style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}
  >
    <div
      className="skeleton"
      style={{ width: w, height: Math.round(w * 1.5), borderRadius: 8 }}
    />
    <div
      className="skeleton"
      style={{ width: "80%", height: 12, borderRadius: 4 }}
    />
  </div>
);

function StarRating({
  value,
  max = 5,
  size = 14,
  interactive = false,
  onChange,
}) {
  const [hover, setHover] = useState(0);
  const containerRef = useRef(null);

  const getValueFromEvent = useCallback(
    (e, starIndex) => {
      if (!interactive) return;
      const starEl = e.currentTarget;
      const rect = starEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const half = x < rect.width / 2;
      return starIndex + (half ? 0.5 : 1);
    },
    [interactive],
  );

  const handleMouseMove = useCallback(
    (e, i) => {
      if (!interactive) return;
      const val = getValueFromEvent(e, i);
      setHover(val);
    },
    [interactive, getValueFromEvent],
  );

  const handleClick = useCallback(
    (e, i) => {
      if (!interactive) return;
      const val = getValueFromEvent(e, i);
      onChange?.(val);
    },
    [interactive, getValueFromEvent, onChange],
  );

  // Touch/drag support
  const handleTouchMove = useCallback(
    (e) => {
      if (!interactive || !containerRef.current) return;
      const touch = e.touches[0];
      const stars = containerRef.current.querySelectorAll("[data-star]");
      for (let i = stars.length - 1; i >= 0; i--) {
        const rect = stars[i].getBoundingClientRect();
        if (touch.clientX >= rect.left) {
          const x = touch.clientX - rect.left;
          const half = x < rect.width / 2;
          const val = i + (half ? 0.5 : 1);
          setHover(val);
          onChange?.(val);
          break;
        }
      }
    },
    [interactive, onChange],
  );

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", gap: 2, touchAction: "none" }}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setHover(0)}
    >
      {Array.from({ length: max }, (_, i) => {
        const displayVal = hover || value;
        const full = displayVal >= i + 1;
        const half = !full && displayVal >= i + 0.5;
        return (
          <svg
            key={i}
            data-star={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            style={{
              cursor: interactive ? "pointer" : "default",
              transition: "transform 0.15s",
              transform:
                interactive && hover && hover >= i + 0.5
                  ? "scale(1.15)"
                  : "scale(1)",
            }}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={(e) => handleClick(e, i)}
          >
            <defs>
              <linearGradient id={`half-${i}-${size}`}>
                <stop offset="50%" stopColor={C.gold} />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={full ? C.gold : half ? `url(#half-${i}-${size})` : "none"}
              stroke={full || half ? C.gold : C.textDim}
              strokeWidth="1.5"
            />
          </svg>
        );
      })}
    </div>
  );
}

function Avatar({ user, size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: user?.color || C.accentSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.33,
        fontWeight: 600,
        color: "#fff",
        flexShrink: 0,
        border: `2px solid ${C.border}`,
      }}
    >
      {user?.initials || "?"}
    </div>
  );
}

function Badge({
  children,
  color = C.accentSoft,
  textColor = C.textMuted,
  small = false,
}) {
  return (
    <span
      style={{
        background: color,
        color: textColor,
        fontSize: small ? 10 : 11,
        fontWeight: 500,
        padding: small ? "2px 7px" : "3px 10px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  style: sx = {},
  disabled = false,
  loading = false,
}) {
  const isDisabled = disabled || loading;
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    fontSize: size === "sm" ? 12 : 13,
    fontWeight: 600,
    padding: size === "sm" ? "6px 14px" : "10px 22px",
    transition: "all 0.18s",
    opacity: isDisabled ? 0.55 : 1,
    cursor: isDisabled ? "not-allowed" : "pointer",
  };
  const variants = {
    gold: {
      background: `linear-gradient(135deg,${C.goldDim},${C.gold})`,
      color: C.bgDeep,
    },
    ghost: {
      background: C.bgCard,
      color: C.textMuted,
      border: `1px solid ${C.border}`,
    },
    outline: {
      background: "transparent",
      color: C.textMuted,
      border: `1px solid ${C.border}`,
    },
  };
  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      style={{ ...base, ...variants[variant], ...sx }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.opacity = "0.85";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = isDisabled ? "0.55" : "1";
        e.currentTarget.style.transform = "";
      }}
    >
      {loading ? <Spinner size={size === "sm" ? 12 : 14} /> : null}
      {children}
    </button>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  note,
  style: sx = {},
}) {
  return (
    <div style={sx}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: C.textMuted,
            marginBottom: 6,
            fontWeight: 500,
          }}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 10,
          background: "rgba(9,21,35,0.6)",
          border: `1px solid ${C.border}`,
          color: C.text,
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.2s, background 0.2s",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = C.gold;
          e.target.style.background = "rgba(9,21,35,0.8)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = C.border;
          e.target.style.background = "rgba(9,21,35,0.6)";
        }}
      />
      {note && (
        <p style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{note}</p>
      )}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          padding: "0 4px",
        }}
      >
        <h2
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: C.text,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {title}
        </h2>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              fontSize: 12,
              color: C.gold,
              fontWeight: 500,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {action.label} →
          </button>
        )}
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
          <div
            key={i}
            style={{
              width: 30,
              height: 44,
              background: C.bgDeep,
              borderRight: `2px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "5px 4px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                height: 7,
                background: C.border,
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: "100%",
                height: 7,
                background: C.border,
                borderRadius: 2,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StreamingBadges({ services, loading }) {
  if (loading)
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{ width: 110, height: 36, borderRadius: 9 }}
          />
        ))}
      </div>
    );
  if (!services?.length)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 9,
          background: "rgba(74,94,114,0.12)",
          border: `1px dashed ${C.border}`,
        }}
      >
        <Radio size={14} />
        <p style={{ fontSize: 12, color: C.textDim, fontStyle: "italic" }}>
          Não encontrado em streaming no Brasil
        </p>
      </div>
    );
  const typeLabel = {
    subscription: "Incluso",
    free: "Grátis",
    rent: "Aluguel",
    buy: "Comprar",
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {services.map((s, i) => (
        <a
          key={i}
          href={s.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 13px",
            borderRadius: 9,
            background: `${s.color}18`,
            border: `1px solid ${s.color}40`,
            color: s.color,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.2s",
            flexDirection: "column",
            minWidth: 90,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${s.color}30`;
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${s.color}18`;
            e.currentTarget.style.transform = "";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 900, lineHeight: 1 }}>
              {s.icon}
            </span>
            <span style={{ fontSize: 12 }}>{s.name}</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 500 }}>
              {s.price || typeLabel[s.type] || s.type}
            </span>
            {s.quality && (
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: `${s.color}30`,
                  fontWeight: 700,
                }}
              >
                {s.quality}
              </span>
            )}
          </div>
          {s.leaving && (
            <span style={{ fontSize: 9, color: C.orange, opacity: 0.9 }}>
              Sai em {s.leaving}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

function RatingsRow({ movie }) {
  const items = [
    movie.rating && {
      src: "TMDb",
      val: `${movie.rating}`,
      suffix: "/10",
      pct: (movie.rating / 10) * 100,
      color: "#01B4E4",
      sub: movie.voteCount
        ? `${(movie.voteCount / 1000).toFixed(0)}k votos`
        : null,
    },
    movie.imdbRating && {
      src: "IMDb",
      val: `${movie.imdbRating}`,
      suffix: "/10",
      pct: (movie.imdbRating / 10) * 100,
      color: "#F5C518",
      sub: movie.imdbVotes,
    },
    movie.rottenTomatoes && {
      src: "RT",
      val: movie.rottenTomatoes.replace("%", ""),
      suffix: "%",
      pct: parseInt(movie.rottenTomatoes),
      color: parseInt(movie.rottenTomatoes) >= 60 ? C.orange : C.red,
      sub: "Rotten Tomatoes",
    },
    movie.metacritic && {
      src: "MC",
      val: movie.metacritic,
      suffix: "/100",
      pct: parseInt(movie.metacritic),
      color:
        parseInt(movie.metacritic) >= 61
          ? C.success
          : parseInt(movie.metacritic) >= 40
            ? C.orange
            : C.red,
      sub: "Metacritic",
    },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map((b, i) => (
        <div
          key={i}
          style={{
            background: C.bgDeep,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "10px 16px",
            minWidth: 78,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              height: 3,
              width: `${Math.min(b.pct, 100)}%`,
              background: b.color,
              borderRadius: "0 2px 2px 0",
              opacity: 0.5,
            }}
          />
          <p
            style={{
              fontSize: 10,
              color: C.textDim,
              marginBottom: 4,
              fontWeight: 500,
            }}
          >
            {b.src}
          </p>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: b.color,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1,
            }}
          >
            {b.val}
            <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>
              {b.suffix}
            </span>
          </p>
          {b.sub && (
            <p style={{ fontSize: 9, color: C.textDim, marginTop: 3 }}>
              {b.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function getMovieClubRatingValue(movie) {
  if (!movie) return null;
  const scores = [
    movie.rating && (Number(movie.rating) / 10) * 5,
    movie.imdbRating && (Number(movie.imdbRating) / 10) * 5,
    movie.rottenTomatoes && (parseInt(movie.rottenTomatoes, 10) / 100) * 5,
    movie.metacritic && (parseInt(movie.metacritic, 10) / 100) * 5,
  ].filter((score) => Number.isFinite(score));
  if (!scores.length) return null;
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.max(0, Math.min(5, avg)).toFixed(1);
}

function MovieCard({ movie, size = "md", onClick }) {
  const w = size === "sm" ? 130 : size === "lg" ? 220 : 180;
  const h = Math.round(w * 1.5);
  const upcoming = isUpcoming(movie);
  const [imgLoaded, setImgLoaded] = useState(false);
  const movieClubRating = getMovieClubRatingValue(movie);

  return (
    <div className="movie-card-netflix" onClick={onClick} style={{ width: w }}>
      <div
        style={{
          width: w,
          height: h,
          borderRadius: 10,
          background: C.bgCard,
          border: `1px solid ${upcoming ? C.accent : C.border}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {movie.poster ? (
          <img
            src={movie.posterHD || movie.poster}
            alt={movie.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: upcoming
                ? "brightness(0.7)"
                : "brightness(1.05) contrast(1.02)",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.5s ease",
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
              flexDirection: "column",
              gap: 6,
              padding: 8,
            }}
          >
            <Film size={28} style={{ opacity: 0.3 }} />
            <p
              style={{
                fontSize: 10,
                color: C.textDim,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {movie.title}
            </p>
          </div>
        )}
        {!imgLoaded && movie.poster && (
          <div
            className="skeleton"
            style={{ position: "absolute", inset: 0, borderRadius: 10 }}
          />
        )}
        {upcoming && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              background: "rgba(37,99,235,0.88)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              padding: "4px 0",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            EM BREVE
          </div>
        )}
        {upcoming && movie.releaseDate && (
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              right: 6,
              background: "rgba(9,21,35,0.92)",
              color: C.accent,
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 6px",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            <Calendar
              size={12}
              style={{ display: "inline", verticalAlign: "middle" }}
            />{" "}
            {formatReleaseDateBR(movie.releaseDate)}
          </div>
        )}
        {/* Hover overlay */}
        <div className="movie-card-overlay">
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.text,
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {movie.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!upcoming && movieClubRating && (
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>
                ★ {movieClubRating}
              </span>
            )}
            {movie.year && (
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {upcoming ? formatReleaseDateBR(movie.releaseDate) : movie.year}
              </span>
            )}
          </div>
        </div>
        {!upcoming && movieClubRating && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "rgba(9,21,35,0.85)",
              color: C.gold,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 7px",
              borderRadius: 6,
            }}
          >
            ★ {movieClubRating}
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
      tmdbProxy({ data: { path: `/movie/${tmdbId}`, params: {} } }),
    )
      .then((d) => {
        if (d?.poster_path) setPoster(tmdb.poster(d.poster_path, "w92"));
      })
      .catch(() => {});
  }, [tmdbId]);
  return poster ? (
    <img
      src={poster}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  ) : null;
}

const BackIcon = () => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
const PlusIcon = () => (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const CheckIcon = () => (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const UsersIcon = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const LinkIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const CopyIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const UserPlusIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);
const UserCheckIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
);
const ShareIcon = () => (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const SearchSVG = ({ size = 16, color = C.textDim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const KeyIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const PlayIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <polygon points="5,3 19,12 5,21" />
  </svg>
);
const HeartIcon = ({ f }) => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill={f ? C.red : "none"}
    stroke={f ? C.red : "currentColor"}
    strokeWidth="2"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const GridIcon = () => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);
const ListIcon = () => (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const PER_PAGE_OPTIONS = [20, 40, 60, 80];

function ViewToolbar({
  viewMode,
  setViewMode,
  perPage,
  setPerPage,
  showPerPage = true,
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {showPerPage && (
        <select
          value={perPage}
          onChange={(e) => setPerPage(Number(e.target.value))}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            fontSize: 12,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} por pág.
            </option>
          ))}
        </select>
      )}
      <div
        style={{
          display: "flex",
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setViewMode("grid")}
          style={{
            padding: "6px 10px",
            background: viewMode === "grid" ? C.gold : "transparent",
            color: viewMode === "grid" ? C.bgDeep : C.textDim,
            transition: "all 0.2s",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <GridIcon />
        </button>
        <button
          onClick={() => setViewMode("list")}
          style={{
            padding: "6px 10px",
            background: viewMode === "list" ? C.gold : "transparent",
            color: viewMode === "list" ? C.bgDeep : C.textDim,
            transition: "all 0.2s",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ListIcon />
        </button>
      </div>
    </div>
  );
}
const ChevronRightIcon = () => (
  <svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

function Carousel({ children, movies, onMovieClick }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const itemsCount = children
    ? React.Children.count(children)
    : (movies?.length ?? 0);

  const checkScroll = useCallback(() => {
    if (!ref.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    setCanLeft(scrollLeft > 10);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.addEventListener("scroll", checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "auto" });
    checkScroll();
  }, [itemsCount, checkScroll]);

  // Gesture-aware: decide horizontal vs vertical based on initial touch direction.
  // Quando o gesto é predominantemente vertical, desabilitamos o scroll horizontal
  // do carrossel para que o navegador propague o scroll para a página (body).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let decided = false;
    let axis = null; // 'x' | 'y' | null

    const onTouchStart = (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      decided = false;
      axis = null;
      // Reset para permitir nova decisão a cada gesto
      el.style.overflowX = "auto";
      el.style.touchAction = "";
      el.removeAttribute("data-gesture");
    };

    const onTouchMove = (e) => {
      if (decided) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      // Threshold para evitar trocar de eixo em micro-movimentos
      if (dx < 6 && dy < 6) return;
      decided = true;
      if (dy > dx) {
        // Gesto vertical → libera scroll da página, congela o carrossel
        axis = "y";
        el.style.overflowX = "hidden";
        el.style.touchAction = "pan-y";
        el.setAttribute("data-gesture", "vertical");
      } else {
        axis = "x";
        el.style.touchAction = "pan-x";
        el.setAttribute("data-gesture", "horizontal");
      }
    };

    const onTouchEnd = () => {
      // Restaura defaults após o gesto para o próximo toque funcionar normalmente
      decided = false;
      axis = null;
      el.style.overflowX = "auto";
      el.style.touchAction = "";
      el.removeAttribute("data-gesture");
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const scroll = (dir) => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.75;
    ref.current.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="carousel-wrapper">
      <button
        className="carousel-btn carousel-btn-left"
        onClick={() => scroll(-1)}
        style={{
          opacity: canLeft ? undefined : 0,
          pointerEvents: canLeft ? "auto" : "none",
        }}
      >
        <ChevronLeft />
      </button>
      <div ref={ref} className="carousel-row">
        {children ||
          movies?.map((m) => (
            <MovieCard key={m.id} movie={m} onClick={() => onMovieClick?.(m)} />
          ))}
      </div>
      <button
        className="carousel-btn carousel-btn-right"
        onClick={() => scroll(1)}
        style={{
          opacity: canRight ? undefined : 0,
          pointerEvents: canRight ? "auto" : "none",
        }}
      >
        <ChevronRight />
      </button>
      {/* Fade edges */}
      {canLeft && (
        <div
          className="carousel-fade carousel-fade-left"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 60,
            background: `linear-gradient(to right, ${C.bg}, transparent)`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}
      {canRight && (
        <div
          className="carousel-fade carousel-fade-right"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: 60,
            background: `linear-gradient(to left, ${C.bg}, transparent)`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}
    </div>
  );
}

function Navbar({ page, setPage, hasKeys, apiStatus, isMobile }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Nav items shared between desktop and mobile bottom nav
  const items = [
    { id: "home", label: "Discover", icon: mascotWizard },
    { id: "quickrate", label: "Avaliar", icon: monkeyFlash },
    { id: "groups", label: "Clubs", icon: mascotSee },
    { id: "profile", label: "Perfil", icon: monkeyPopcorn },
    { id: "friends", label: "Amigos", icon: monkeyCrew },
    { id: "search", label: "Buscar", icon: monkeySearch },
  ];

  return (
    <>
      {/* ── Top bar (always visible) ── */}
      <nav className={`top-bar${scrolled ? " scrolled" : ""}`}>
        <button
          onClick={() => setPage("home")}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <img
            src={logoText}
            alt="MovieClub"
            style={{
              height: isMobile ? 26 : 32,
              filter: "drop-shadow(0 0 8px rgba(201,168,76,0.2))",
            }}
          />
        </button>

        {/* Desktop nav items — hidden on mobile via CSS */}
        <div className="desktop-nav" style={{ display: "flex", gap: 4 }}>
          {items.map(({ id, label, icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? C.gold : C.textMuted,
                  background: active ? "rgba(201,168,76,0.1)" : "transparent",
                  borderRadius: 12,
                  transition: "all 0.25s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "'DM Sans', sans-serif",
                  minHeight: "unset",
                  minWidth: "unset",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = C.text;
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = C.textMuted;
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: active
                      ? `2px solid ${C.gold}`
                      : "2px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active
                      ? "rgba(201,168,76,0.15)"
                      : "rgba(255,255,255,0.06)",
                    transition: "all 0.25s",
                    flexShrink: 0,
                    boxShadow: active
                      ? "0 0 10px rgba(201,168,76,0.3)"
                      : "none",
                  }}
                >
                  <img
                    src={icon}
                    alt=""
                    style={{
                      width: 26,
                      height: 26,
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                </div>
                {label}
              </button>
            );
          })}
        </div>

        {/* Mobile: current page title */}
        {isMobile && (
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.textMuted,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {items.find((i) => i.id === page)?.label || ""}
          </p>
        )}
      </nav>

      {/* ── Bottom nav (mobile only, CSS-controlled) ── */}
      <nav className="bottom-nav">
        {items.map(({ id, label, icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              className={`bottom-nav-item${active ? " active" : ""}`}
              onClick={() => setPage(id)}
            >
              <div className="nav-icon">
                <img src={icon} alt={label} />
              </div>
              <span className="nav-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function PaginationBar({ page, totalPages, totalResults, onPageChange }) {
  if (totalPages <= 1) return null;
  const getVisiblePages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 2),
        end = Math.min(totalPages - 1, page + 2);
      if (page <= 3) {
        start = 2;
        end = 5;
      }
      if (page >= totalPages - 2) {
        start = totalPages - 4;
        end = totalPages - 1;
      }
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };
  const btnStyle = (active) => ({
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    background: active ? C.gold : C.bgCard,
    color: active ? C.bgDeep : C.textMuted,
    border: `1px solid ${active ? C.gold : C.border}`,
    cursor: "pointer",
    transition: "all 0.2s",
    minWidth: 36,
    textAlign: "center",
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        marginTop: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{ ...btnStyle(false), opacity: page <= 1 ? 0.3 : 1 }}
        >
          ← Anterior
        </button>
        {getVisiblePages().map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} style={{ color: C.textDim, fontSize: 12 }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={btnStyle(p === page)}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{ ...btnStyle(false), opacity: page >= totalPages ? 0.3 : 1 }}
        >
          Próxima →
        </button>
      </div>
      <span style={{ fontSize: 11, color: C.textDim }}>
        Página {page.toLocaleString("pt-BR")} de{" "}
        {totalPages.toLocaleString("pt-BR")} —{" "}
        {totalResults.toLocaleString("pt-BR")} filmes
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
//  HERO BANNER (Netflix-style)

function HeroBanner({ movies, onSelect }) {
  const [idx, setIdx] = useState(0);
  const hero = movies[idx];

  useEffect(() => {
    if (movies.length <= 1) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % Math.min(movies.length, 5)),
      8000,
    );
    return () => clearInterval(t);
  }, [movies.length]);

  if (!hero) return null;

  return (
    <div
      className="hero-section"
      style={{
        height: 520,
        position: "relative",
        overflow: "hidden",
        marginBottom: 0,
      }}
    >
      {/* Backdrop */}
      {hero.backdrop && (
        <img
          key={hero.id}
          src={hero.backdrop}
          alt=""
          className="hero-backdrop"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.45,
          }}
        />
      )}

      {/* Gradient overlays */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to right, ${C.bg} 0%, rgba(15,25,35,0.6) 50%, rgba(15,25,35,0.1) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${C.bg} 0%, transparent 50%)`,
        }}
      />

      {/* Content */}
      <div
        className="hero-content"
        style={{
          position: "absolute",
          bottom: 80,
          left: 48,
          maxWidth: 560,
          zIndex: 1,
          animation: "fadeIn 0.5s ease",
        }}
        key={hero.id}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <Badge color="rgba(201,168,76,0.15)" textColor={C.gold}>
            ✦ Em Alta Esta Semana
          </Badge>
          {hero.rating && (
            <Badge color="rgba(201,168,76,0.1)" textColor={C.goldLight}>
              ★ {hero.rating}/10
            </Badge>
          )}
        </div>
        <h1
          className="hero-title"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 42,
            fontWeight: 900,
            color: C.text,
            marginBottom: 8,
            lineHeight: 1.1,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          {hero.title}
        </h1>
        {hero.overview && (
          <p
            style={{
              color: C.textMuted,
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 20,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {hero.overview}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Btn
            variant="gold"
            onClick={() => onSelect(hero)}
            style={{ padding: "10px 22px", fontSize: 14 }}
          >
            <PlayIcon /> Ver Detalhes
          </Btn>
        </div>
      </div>

      {/* ── Indicators — agora usam classe CSS ─────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
          zIndex: 2,
          alignItems: "center",
        }}
      >
        {movies.slice(0, 5).map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`hero-indicator${idx === i ? " active" : ""}`}
          />
        ))}
      </div>

      {/* Mini posters — hidden on mobile via CSS */}
      <div
        className="hero-mini-posters"
        style={{
          position: "absolute",
          right: 40,
          bottom: 60,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          zIndex: 1,
        }}
      >
        {movies.slice(0, 5).map((m, i) => (
          <div
            key={m.id}
            onClick={() => setIdx(i)}
            style={{
              width: 72,
              cursor: "pointer",
              opacity: idx === i ? 1 : 0.5,
              transform: idx === i ? "scale(1.1)" : "scale(1)",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                height: 108,
                borderRadius: 6,
                overflow: "hidden",
                border:
                  idx === i ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                boxShadow: idx === i ? `0 0 20px rgba(201,168,76,0.3)` : "none",
              }}
            >
              {m.poster && (
                <img
                  src={m.poster}
                  alt={m.title}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  HOME PAGE (Netflix layout)

function Top10Card({ movie, rank, onClick }) {
  const movieClubRating = getMovieClubRatingValue(movie);
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        flexShrink: 0,
        position: "relative",
        width: 200,
      }}
      className="movie-card-netflix"
    >
      <span
        style={{
          fontSize: 82,
          fontWeight: 900,
          fontFamily: "'Outfit', sans-serif",
          color: "transparent",
          WebkitTextStroke: `2px ${C.gold}`,
          lineHeight: 1,
          position: "absolute",
          left: -8,
          bottom: -8,
          zIndex: 2,
          textShadow: `0 0 20px rgba(201,168,76,0.2)`,
        }}
      >
        {rank}
      </span>
      <div
        style={{
          width: 130,
          height: 195,
          borderRadius: 10,
          overflow: "hidden",
          marginLeft: 40,
          border: `1px solid ${C.border}`,
          background: C.bgCard,
          position: "relative",
          zIndex: 1,
        }}
      >
        {movie.poster ? (
          <img
            src={movie.posterHD || movie.poster}
            alt={movie.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Film size={28} style={{ opacity: 0.3 }} />
          </div>
        )}
        {movieClubRating && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "rgba(9,21,35,0.85)",
              color: C.gold,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 7px",
              borderRadius: 6,
            }}
          >
            ★ {movieClubRating}
          </div>
        )}
      </div>
    </div>
  );
}

function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("in");

  // Import logoMain dynamically to keep this file standalone
  const [logoSrc, setLogoSrc] = useState("");
  useEffect(() => {
    import("./foundation").then(({ logoMain }) => setLogoSrc(logoMain));
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 2200);
    const t2 = setTimeout(() => onFinish(), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: `radial-gradient(ellipse at center, #1B2838, ${C.bg})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation:
          phase === "out" ? "splashFadeOut 0.5s ease forwards" : undefined,
      }}
    >
      {logoSrc && (
        <img
          src={logoSrc}
          alt="MovieClub Logo"
          style={{
            width: "min(320px, 75vw)",
            animation: "splashFadeIn 1s ease 0.2s both",
            filter: "drop-shadow(0 0 40px rgba(201,168,76,0.3))",
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  LOGIN PAGE (redesigned)

export {
  Spinner,
  SkeletonCard,
  StarRating,
  Avatar,
  Badge,
  Btn,
  TextInput,
  Section,
  FilmStripBg,
  StreamingBadges,
  RatingsRow,
  MovieCard,
  MiniPoster,
  BackIcon,
  PlusIcon,
  CheckIcon,
  UsersIcon,
  LinkIcon,
  CopyIcon,
  UserPlusIcon,
  UserCheckIcon,
  ShareIcon,
  SearchSVG,
  KeyIcon,
  PlayIcon,
  HeartIcon,
  ChevronLeftIcon,
  GridIcon,
  ListIcon,
  ChevronRightIcon,
  ViewToolbar,
  Carousel,
  Navbar,
  PaginationBar,
  HeroBanner,
  Top10Card,
  SplashScreen,
};

// @ts-nocheck
// InstallBanner — centralized & polished for all devices
// Replace the existing InstallBanner export in ui.tsx with this

export function InstallBanner({ isIOS, onInstall, onDismiss }) {
  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onDismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1998,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      />

      {/* Banner — perfeitamente centralizado e responsivo */}
      <div
        style={{
          position: "fixed",
          // Respeita a safe-area do celular (como o "notch" inferior do iPhone)
          // e ainda permite somar a altura de uma navbar customizada, se existir.
          bottom:
            "calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom, 16px) + 24px)",
          // Centralização universal sem usar transform
          left: 16,
          right: 16,
          margin: "0 auto",
          maxWidth: 480,
          boxSizing: "border-box", // Garante que o padding não quebre a largura
          zIndex: 1999,
          background: "linear-gradient(135deg, #162130 0%, #1b2d42 100%)",
          border: "1px solid rgba(201,168,76,0.45)",
          borderRadius: 22,
          padding: 18,
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
          animation:
            "bannerSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss */}
        <button
          onClick={onDismiss}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#4a5e72",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            minHeight: "unset",
            minWidth: "unset",
            lineHeight: 1,
            transition: "all 0.18s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            e.currentTarget.style.color = "#8a9bb0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            e.currentTarget.style.color = "#4a5e72";
          }}
        >
          ✕
        </button>

        {/* App icon */}
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            overflow: "hidden",
            flexShrink: 0,
            border: "1.5px solid rgba(201,168,76,0.35)",
            boxShadow: "0 4px 14px rgba(201,168,76,0.2)",
            background: "#0f1923",
          }}
        >
          <img
            src="/apple-touch-icon.png"
            alt="MovieClub"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.style.background =
                "linear-gradient(135deg, #8a6e30, #c9a84c)";
            }}
          />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 15,
              fontWeight: 800,
              color: "#f0ede6",
              marginBottom: 3,
              margin: 0, // Reset de margin nativo
              paddingBottom: 3,
            }}
          >
            Instalar MovieClub
          </p>
          {isIOS ? (
            <p
              style={{
                fontSize: 12,
                color: "#8a9bb0",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Toque em{" "}
              <strong style={{ color: "#c9a84c" }}>Compartilhar</strong> e
              depois{" "}
              <strong style={{ color: "#c9a84c" }}>"Tela de Início"</strong>
            </p>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "#8a9bb0",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Acesso rápido direto da tela inicial
            </p>
          )}
        </div>

        {/* Install button (Android only) */}
        {!isIOS && (
          <button
            onClick={onInstall}
            style={{
              padding: "9px 18px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #8a6e30, #c9a84c)",
              color: "#0f1923",
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "'Outfit', sans-serif",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              minHeight: "unset",
              minWidth: "unset",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 14px rgba(201,168,76,0.3)",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 18px rgba(201,168,76,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(201,168,76,0.3)";
            }}
          >
            Instalar
          </button>
        )}
      </div>
    </>
  );
}
