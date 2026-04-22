// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import Papa from "papaparse";
import {
  C,
  MONKEY_AVATARS,
  tmdb,
  normalizeTmdb,
  TMDB_IMG,
  logoMain,
  mascotsNav,
  logoText,
  apiCache,
} from "../foundation";
import { tmdbProxy } from "@/lib/movie-api.functions";
import {
  Film,
  ClipboardList,
  Star,
  Users,
  Pencil,
  Link2,
  X,
  UserRound,
  Bookmark,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Settings,
  Grid3X3,
  List,
  UserPlus,
  UserCheck,
  LogOut,
} from "lucide-react";
import {
  Spinner,
  StarRating,
  Badge,
  Btn,
  TextInput,
  Section,
  ViewToolbar,
} from "../ui";
import { useRatings, useWatchlist, useFollows, useFriendships } from "../hooks";

// ─── cachedFetch helper (same as foundation) ───
async function cachedFetch(key, fetcher, ttlMs = 5 * 60 * 1000) {
  const hit = apiCache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const data = await fetcher();
  apiCache.set(key, { data, ts: Date.now() });
  return data;
}

// ─── Genre colors mapping ───
const GENRE_COLORS = {
  Ação: "#EF4444",
  Action: "#EF4444",
  Aventura: "#F97316",
  Adventure: "#F97316",
  Animação: "#8B5CF6",
  Animation: "#8B5CF6",
  Comédia: "#EAB308",
  Comedy: "#EAB308",
  Crime: "#6366F1",
  Thriller: "#6366F1",
  Drama: "#3B82F6",
  Fantasia: "#EC4899",
  Fantasy: "#EC4899",
  Terror: "#9333EA",
  Horror: "#9333EA",
  Romance: "#F43F5E",
  "Ficção Científica": "#06B6D4",
  "Science Fiction": "#06B6D4",
  Documentário: "#10B981",
  Documentary: "#10B981",
};

function exportRatingsCSV(ratings, displayName = "user") {
  if (!ratings || ratings.length === 0) {
    toast.info("Nenhuma avaliação para exportar ainda!");
    return;
  }
  const headers = ["Título", "Nota (1-5)", "Review", "Data"];
  const rows = ratings.map((r) => {
    const title = (r.title || "Desconhecido").replace(/"/g, '""');
    const rating = Number(r.rating).toFixed(1);
    const review = (r.review || "").replace(/"/g, '""');
    const date = r.updated_at
      ? new Date(r.updated_at).toLocaleDateString("pt-BR")
      : "";
    return `"${title}","${rating}","${review}","${date}"`;
  });
  const csvContent = [headers.join(","), ...rows].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `movieclub-avaliacoes-${displayName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(
    `${ratings.length} avaliação${ratings.length !== 1 ? "ões" : ""} exportada${ratings.length !== 1 ? "s" : ""}!`,
  );
}

// ─── Import Data Modal ───
function ImportDataModal(props) {
  if (typeof document === "undefined") return null;
  return createPortal(<ImportDataModalInner {...props} />, document.body);
}

function ImportDataModalInner({ userId, onClose }) {
  const [step, setStep] = useState("select_platform");
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
          )
            movieMap.set(key, {
              name,
              year,
              rating,
              review,
              date: r.Date || "",
            });
        });
      };
      addToMap(csvFiles["ratings.csv"]);
      addToMap(csvFiles["diary.csv"]);
      addToMap(csvFiles["reviews.csv"], true);
      const watchlistEntries = (csvFiles["watchlist.csv"] || [])
        .filter((r) => r.Name?.trim())
        .map((r) => ({ name: r.Name.trim(), year: r.Year?.trim() }));
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
                1. Exporte seus dados do letterboxd:{" "}
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

// ─── Profile Edit Modal ───
function ProfileEditModal(props) {
  if (typeof document === "undefined") return null;
  return createPortal(<ProfileEditModalInner {...props} />, document.body);
}

function ProfileEditModalInner({ profile, user, onClose, onSave }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [avatarTab, setAvatarTab] = useState("monkeys");
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

// ─── Profile Page Mobile ───
export function ProfilePageMobile({
  setPage,
  auth: authCtx,
  setSelectedMovie,
  viewUserId,
  isViewingOther,
  profile,
  otherProfile,
  isMobile,
}) {
  const currentUserId = authCtx?.user?.id;
  const targetUserId = isViewingOther ? viewUserId : currentUserId;
  const displayProfile = isViewingOther ? otherProfile : authCtx?.profile;

  const { ratings, loading: ratingsLoading } = useRatings(targetUserId);
  const {
    items: watchlistItems,
    loading: wlLoading,
    remove: removeFromWl,
  } = useWatchlist(targetUserId);
  const [tab, setTab] = useState("ratings");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { follow, unfollow, isFollowing } = useFollows(currentUserId);
  const { followers: targetFollowers, following: targetFollowing } =
    useFollows(targetUserId);
  const { isFriend } = useFriendships(currentUserId);

  const displayName =
    displayProfile?.display_name ||
    (isViewingOther ? "Usuário" : authCtx?.user?.email || "Usuário");
  const initials = displayName.slice(0, 2).toUpperCase();
  const uname =
    displayProfile?.username ||
    (!isViewingOther ? authCtx?.user?.email?.split("@")[0] : null) ||
    "user";
  const bio = displayProfile?.bio || "";
  const avgRating =
    ratings.length > 0
      ? (
          ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length
        ).toFixed(1)
      : null;

  const [favGenres, setFavGenres] = useState([]);
  useEffect(() => {
    if (!ratings.length) {
      setFavGenres([]);
      return;
    }
    let alive = true;
    Promise.all(
      ratings.map((r) =>
        cachedFetch(`mini_${r.tmdb_id}`, () =>
          tmdbProxy({ data: { path: `/movie/${r.tmdb_id}`, params: {} } }),
        ).catch(() => null),
      ),
    ).then((results) => {
      if (!alive) return;
      const genreCount = {};
      results.filter(Boolean).forEach((m) => {
        (m.genres || []).forEach((g) => {
          const n = g.name || g;
          if (n) genreCount[n] = (genreCount[n] || 0) + 1;
        });
      });
      const sorted = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      setFavGenres(sorted.map(([name, count]) => ({ name, count })));
    });
    return () => {
      alive = false;
    };
  }, [ratings]);

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", paddingBottom: 100 }}>
      {/* ── Header barra ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(15,25,35,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {isViewingOther ? (
          <button
            onClick={() => setPage("profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: C.textMuted,
              fontSize: 14,
              minHeight: "unset",
              minWidth: "unset",
              background: "none",
              border: "none",
            }}
          >
            <ChevronLeft size={20} /> Voltar
          </button>
        ) : (
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: C.text,
            }}
          >
            @{uname}
          </p>
        )}
        {!isViewingOther && (
          <button
            onClick={() => setShowSettings(true)}
            style={{
              color: C.textMuted,
              minHeight: "unset",
              minWidth: "unset",
              background: "none",
              border: "none",
            }}
          >
            <Settings size={22} />
          </button>
        )}
        {isViewingOther && (
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: C.text,
            }}
          >
            @{uname}
          </p>
        )}
        {isViewingOther && <div style={{ width: 60 }} />}
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {/* ── Profile header — IG style ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 14,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              flexShrink: 0,
              background: displayProfile?.avatar_url
                ? "transparent"
                : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
              border: `3px solid ${C.gold}`,
              boxShadow: `0 0 0 2px ${C.bg}, 0 0 0 4px ${C.goldDim}40`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
              color: C.bgDeep,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {displayProfile?.avatar_url ? (
              <img
                src={displayProfile.avatar_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          {/* Stats — IG style: 3 números */}
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "space-around",
              paddingTop: 8,
            }}
          >
            {[
              ["Filmes", ratings.length],
              ["Seguindo", targetFollowing.length],
              ["Seguidores", targetFollowers.length],
            ].map(([label, val]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: C.text,
                    fontFamily: "'Outfit', sans-serif",
                    lineHeight: 1.1,
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
        </div>

        {/* Name + bio */}
        <div style={{ marginBottom: 12 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: C.text,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {displayName}
          </p>
          {avgRating && (
            <p style={{ fontSize: 12, color: C.gold, marginTop: 2 }}>
              ★ {avgRating} nota média · {watchlistItems.length} na watchlist
            </p>
          )}
          {bio && (
            <p
              style={{
                fontSize: 13,
                color: C.textMuted,
                marginTop: 5,
                lineHeight: 1.5,
              }}
            >
              {bio}
            </p>
          )}
        </div>

        {/* Fav genres pills */}
        {favGenres.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            {favGenres.map((g) => {
              const color = GENRE_COLORS[g.name] || C.accent;
              return (
                <span
                  key={g.name}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: `${color}18`,
                    border: `1px solid ${color}40`,
                    color,
                  }}
                >
                  {g.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {isViewingOther ? (
            <>
              <button
                onClick={() => {
                  if (isFollowing(viewUserId)) unfollow(viewUserId);
                  else follow(viewUserId);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  background: isFollowing(viewUserId)
                    ? C.bgCard
                    : `linear-gradient(135deg, ${C.goldDim}, ${C.gold})`,
                  border: isFollowing(viewUserId)
                    ? `1px solid ${C.border}`
                    : "none",
                  color: isFollowing(viewUserId) ? C.text : C.bgDeep,
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  minHeight: "unset",
                }}
              >
                {isFollowing(viewUserId) ? (
                  <>
                    <UserCheck size={16} /> Seguindo
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Seguir
                  </>
                )}
              </button>
              {isFriend(viewUserId) && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(34,197,94,0.12)",
                    border: `1px solid rgba(34,197,94,0.3)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#22C55E",
                    fontWeight: 600,
                  }}
                >
                  Amigo
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: "unset",
                cursor: "pointer",
              }}
            >
              <Pencil size={15} /> Editar Perfil
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          background: C.bg,
          position: "sticky",
          top: 48,
          zIndex: 9,
        }}
      >
        {[
          { id: "ratings", icon: <Grid3X3 size={18} />, label: ratings.length },
          {
            id: "watchlist",
            icon: <Bookmark size={18} />,
            label: watchlistItems.length,
          },
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color: tab === id ? C.gold : C.textDim,
              borderBottom:
                tab === id ? `2px solid ${C.gold}` : "2px solid transparent",
              background: "none",
              border: "none",
              transition: "all 0.2s",
              minHeight: "unset",
              cursor: "pointer",
            }}
          >
            {icon}
            <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Grid de pôsteres — 3 colunas IG style ── */}
      {tab === "ratings" &&
        (ratingsLoading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Spinner size={28} />
          </div>
        ) : ratings.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            }}
          >
            {ratings.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedMovie?.({
                    tmdbId: r.tmdb_id,
                    title: r.title,
                    poster: r.poster_url,
                  });
                  setPage("movie");
                }}
                style={{
                  aspectRatio: "2/3",
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                  background: C.bgCard,
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
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.2,
                    }}
                  >
                    <Film size={24} />
                  </div>
                )}
                {/* Rating badge overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.78)",
                    borderRadius: 6,
                    padding: "2px 7px",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Star size={10} fill={C.gold} stroke="none" />
                  <span
                    style={{
                      fontSize: 11,
                      color: C.gold,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {Number(r.rating).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Film size={40} style={{ color: "#4A5E72", marginBottom: 12 }} />
            <p style={{ color: C.textMuted, fontSize: 15, fontWeight: 500 }}>
              Nenhuma avaliação ainda
            </p>
            <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>
              Avalie filmes para construir seu histórico!
            </p>
          </div>
        ))}

      {tab === "watchlist" &&
        (wlLoading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Spinner size={28} />
          </div>
        ) : watchlistItems.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            }}
          >
            {watchlistItems.map((item) => (
              <div
                key={item.id}
                style={{
                  aspectRatio: "2/3",
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                  background: C.bgCard,
                }}
                onClick={() => {
                  setSelectedMovie?.({
                    tmdbId: item.tmdb_id,
                    title: item.title,
                    poster: item.poster_url,
                  });
                  setPage("movie");
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
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.2,
                    }}
                  >
                    <Film size={24} />
                  </div>
                )}
                {/* Remove button */}
                {!isViewingOther && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWl(item.tmdb_id);
                    }}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.7)",
                      color: "#ef4444",
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      minHeight: "unset",
                      minWidth: "unset",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Bookmark
              size={40}
              style={{ color: "#4A5E72", marginBottom: 12 }}
            />
            <p style={{ color: C.textMuted, fontSize: 15, fontWeight: 500 }}>
              Watchlist vazia
            </p>
            <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>
              Salve filmes para assistir depois!
            </p>
          </div>
        ))}

      {/* Settings bottom sheet */}
      {showSettings &&
        createPortal(
          <>
            <div
              className="bottom-sheet-overlay"
              onClick={() => setShowSettings(false)}
            />
            <div className="bottom-sheet">
              <div className="bottom-sheet-handle" />
              <div style={{ paddingBottom: 8 }}>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.text,
                    fontFamily: "'Outfit', sans-serif",
                    marginBottom: 20,
                  }}
                >
                  Conta
                </p>
                {[
                  {
                    icon: <Pencil size={18} />,
                    label: "Editar Perfil",
                    action: () => {
                      setShowSettings(false);
                      setShowEditModal(true);
                    },
                  },
                  {
                    icon: <Upload size={18} />,
                    label: "Importar Dados (Letterboxd)",
                    action: () => {
                      setShowSettings(false);
                      setShowImportModal(true);
                    },
                  },
                  {
                    icon: <Download size={18} />,
                    label: "Exportar Avaliações (CSV)",
                    action: () => {
                      exportRatingsCSV(ratings, displayName);
                      setShowSettings(false);
                    },
                  },
                  {
                    icon: <Link2 size={18} />,
                    label: "Compartilhar Perfil",
                    action: () => {
                      const url = `${window.location.origin}?profile=${currentUserId}`;
                      navigator.clipboard
                        .writeText(url)
                        .then(() => toast.success("Link copiado!"));
                      setShowSettings(false);
                    },
                  },
                ].map(({ icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "15px 0",
                      borderBottom: `1px solid ${C.border}`,
                      color: C.text,
                      fontSize: 15,
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      minHeight: "unset",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ color: C.textMuted }}>{icon}</span>
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    authCtx?.signOut?.();
                    setShowSettings(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "15px 0",
                    color: C.red,
                    fontSize: 15,
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    marginTop: 4,
                    minHeight: "unset",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={18} />
                  Sair da conta
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}

      {showEditModal && !isViewingOther && (
        <ProfileEditModal
          profile={displayProfile}
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
    </div>
  );
}

// ─── Profile Page Desktop (Para PC) ───
export function ProfilePageDesktop(props) {
  const {
    setPage,
    auth: authCtx,
    setSelectedMovie,
    viewUserId,
    isViewingOther,
    profile,
  } = props;

  const currentUserId = authCtx?.user?.id;
  const targetUserId = isViewingOther ? viewUserId : currentUserId;

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

  const bannerPosters = ratings
    .filter((r) => r.poster_url)
    .slice(0, 4)
    .map((r) => r.poster_url);

  const [favGenres, setFavGenres] = useState([]);
  useEffect(() => {
    if (!ratings.length) {
      setFavGenres([]);
      return;
    }
    let alive = true;
    Promise.all(
      ratings.map((r) =>
        cachedFetch(`mini_${r.tmdb_id}`, () =>
          tmdbProxy({ data: { path: `/movie/${r.tmdb_id}`, params: {} } }),
        ).catch(() => null),
      ),
    ).then((results) => {
      if (!alive) return;
      const genreCount = {};
      results.filter(Boolean).forEach((m) => {
        (m.genres || []).forEach((g) => {
          const genreName = g.name || g;
          if (genreName)
            genreCount[genreName] = (genreCount[genreName] || 0) + 1;
        });
      });
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

  return (
    <div
      style={{
        paddingTop: "calc(var(--top-bar-height) + var(--safe-top))",
        paddingBottom:
          "calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px)",
        minHeight: "100dvh",
      }}
    >
      {/* Banner */}
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

            {/* Stats */}
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

            {/* Fav genres */}
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
                    onClick={() => setPage("profile")}
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
                    {isFollowing(viewUserId) ? "Seguindo" : "Seguir"}
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
                    onClick={() => exportRatingsCSV(ratings, displayName)}
                  >
                    <Download size={13} /> Exportar CSV
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

        {/* Tabs */}
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

// ─── Roteador Principal (Decide se é Mobile ou PC) ───
export function ProfilePage(props) {
  const { auth: authCtx, viewUserId } = props;
  const [isMobile, setIsMobile] = useState(false);

  // Monitora o tamanho da tela
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth <= 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const currentUserId = authCtx?.user?.id;
  const isViewingOther = viewUserId && viewUserId !== currentUserId;

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

  // Renderiza o componente correspondente ao tamanho da tela!
  if (isMobile) {
    return (
      <ProfilePageMobile
        {...props}
        isViewingOther={isViewingOther}
        otherProfile={otherProfile}
        displayProfile={profile}
      />
    );
  }

  return (
    <ProfilePageDesktop
      {...props}
      isViewingOther={isViewingOther}
      otherProfile={otherProfile}
      profile={profile}
    />
  );
}
