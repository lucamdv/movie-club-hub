// @ts-nocheck
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { C, tmdb, omdb } from "../foundation";
import { Spinner, Btn, CheckIcon } from "../ui";
import { useUserPreferences } from "../hooks";
import { Calendar, SlidersHorizontal, Star, Sparkles } from "lucide-react";

export function SettingsPage({ apiStatus, auth, isMobile }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});
  const { preferences, loading, savePreferences } = useUserPreferences(auth?.user?.id);
  const [minYear, setMinYear] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMinYear(preferences.recommendation_min_year || "");
    setMinRating(Number(preferences.recommendation_min_rating || 0));
  }, [preferences.recommendation_min_year, preferences.recommendation_min_rating]);

  const handleSave = async () => {
    const parsedYear = minYear === "" ? null : Number(minYear);
    if (parsedYear && (parsedYear < 1888 || parsedYear > 2100)) {
      toast.error("Escolha um ano entre 1888 e 2100");
      return;
    }
    setSaving(true);
    try {
      await savePreferences({ recommendation_min_year: parsedYear, recommendation_min_rating: Number(minRating) });
      toast.success("Configurações salvas");
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const testApis = async () => {
    setTesting(true);
    setResults({});
    try {
      const tmdbRes = await tmdb.popular();
      setResults((r) => ({ ...r, tmdb: { ok: !!tmdbRes?.results, msg: tmdbRes?.results ? `✓ TMDb respondeu com ${tmdbRes.results.length} filmes` : "✗ Falha na resposta" } }));
    } catch (e) {
      setResults((r) => ({ ...r, tmdb: { ok: false, msg: `✗ Erro: ${e.message}` } }));
    }
    try {
      const omdbRes = await omdb.byTitle("Inception", 2010);
      setResults((r) => ({ ...r, omdb: { ok: !!omdbRes?.Title, msg: omdbRes?.Title ? `✓ OMDb: "${omdbRes.Title}" (${omdbRes.Year})` : "✗ Sem resposta" } }));
    } catch (e) {
      setResults((r) => ({ ...r, omdb: { ok: false, msg: `✗ Erro: ${e.message}` } }));
    }
    setTesting(false);
  };

  const APIS = [
    { key: "tmdb", label: "TMDb API", color: "#01B4E4", desc: "Pôsteres, metadados, elenco, trailers, busca e recomendações." },
    { key: "omdb", label: "OMDb API", color: "#F5C518", desc: "Ratings IMDb, Rotten Tomatoes, Metacritic, bilheteria e prêmios." },
    { key: "streaming", label: "Streaming Availability", color: "#0055DA", desc: "Onde assistir no Brasil — Netflix, Prime, Disney+, Max e mais." },
  ];

  return (
    <div style={{ paddingTop: isMobile ? 24 : 80, paddingBottom: 90 }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: isMobile ? "0 16px" : "0 28px" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: C.gold, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Preferências do app
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: isMobile ? 28 : 34, fontWeight: 900, color: C.text, marginBottom: 8 }}>
            Configurações
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7 }}>
            Ajuste como o MovieClub escolhe filmes para você no Discover e no Quick Rate.
          </p>
        </div>

        <div style={{ background: `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.92))`, border: `1px solid rgba(201,168,76,0.24)`, borderRadius: 18, padding: isMobile ? 18 : 24, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: `${C.gold}18`, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold }}>
              <Sparkles size={21} />
            </div>
            <div>
              <h2 style={{ color: C.text, fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Recomendações</h2>
              <p style={{ color: C.textMuted, fontSize: 12 }}>Usado em “Recomendados para Você” e no Quick Rate.</p>
            </div>
          </div>

          {loading ? <Spinner /> : (
            <div style={{ display: "grid", gap: 18 }}>
              <label style={{ display: "grid", gap: 9 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13, fontWeight: 700 }}><Calendar size={16} color={C.gold} /> Ano mínimo dos filmes</span>
                <input value={minYear} onChange={(e) => setMinYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="Sem filtro" inputMode="numeric" style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, outline: "none", fontSize: 15 }} />
              </label>

              <label style={{ display: "grid", gap: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13, fontWeight: 700 }}><Star size={16} color={C.gold} fill={C.gold} /> Nota mínima MovieClub</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <input type="range" min="0" max="5" step="0.1" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} style={{ flex: 1, accentColor: C.gold }} />
                  <strong style={{ color: C.gold, fontSize: 22, fontFamily: "'Outfit', sans-serif", minWidth: 48, textAlign: "right" }}>{Number(minRating).toFixed(1)}</strong>
                </div>
              </label>

              <Btn variant="gold" onClick={handleSave} disabled={saving}>{saving ? <><Spinner size={14} /> Salvando…</> : <><SlidersHorizontal size={15} /> Salvar preferências</>}</Btn>
            </div>
          )}
        </div>

        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: isMobile ? 18 : 24 }}>
          <h2 style={{ color: C.text, fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 14 }}>Qualidade dos serviços</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {APIS.map((api) => {
              const result = results[api.key];
              return <div key={api.key} style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: api.color }} /><h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{api.label}</h3></div>
                <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.55 }}>{api.desc}</p>
                {result && <p style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: result.ok ? C.success : C.red }}>{result.msg}</p>}
              </div>;
            })}
          </div>
          <div style={{ marginTop: 18 }}><Btn variant="ghost" onClick={testApis}>{testing ? <><Spinner size={14} /> Testando…</> : <><CheckIcon /> Testar serviços</>}</Btn></div>
        </div>
      </div>
    </div>
  );
}