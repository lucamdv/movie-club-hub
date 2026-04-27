// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { C } from "../foundation";
import { Spinner, Btn } from "../ui";
import { useUserPreferences } from "../hooks";
import {
  Sparkles,
  LayoutGrid,
  Globe,
  Film,
  Bell,
  Shield,
  Save,
  RotateCcw,
  Zap,
  Calendar,
  Clock,
  Languages,
  Tags,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

const GENRE_OPTIONS = [
  "Ação", "Aventura", "Animação", "Comédia", "Crime", "Documentário",
  "Drama", "Família", "Fantasia", "História", "Terror", "Música",
  "Mistério", "Romance", "Ficção Científica", "Cinema TV", "Thriller",
  "Guerra", "Faroeste",
];

const LANGUAGE_OPTIONS = [
  { code: "pt", label: "Português" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Alemão" },
  { code: "ja", label: "Japonês" },
  { code: "ko", label: "Coreano" },
  { code: "zh", label: "Chinês" },
];

const REGION_OPTIONS = [
  { code: "BR", label: "Brasil" },
  { code: "US", label: "Estados Unidos" },
  { code: "PT", label: "Portugal" },
  { code: "ES", label: "Espanha" },
  { code: "AR", label: "Argentina" },
  { code: "MX", label: "México" },
  { code: "GB", label: "Reino Unido" },
  { code: "FR", label: "França" },
  { code: "DE", label: "Alemanha" },
  { code: "JP", label: "Japão" },
];

const CURRENT_YEAR = new Date().getFullYear();
const MAX_YEAR = CURRENT_YEAR + 5;

// Defaults aplicados ao limpar os filtros de recomendação
const RECOMMENDATION_DEFAULTS = {
  recommendation_min_year: null,
  recommendation_min_rating: 0,
  recommendation_max_runtime: null,
  hide_unrated_recommendations: false,
  preferred_languages: [],
  excluded_genres: [],
  show_adult_content: false,
};

// ─── Validation schema ────────────────────────────────────
const recommendationSchema = z.object({
  recommendation_min_year: z
    .union([z.null(), z.literal("")])
    .or(
      z.coerce
        .number({ invalid_type_error: "Use apenas números" })
        .int("O ano deve ser um número inteiro")
        .min(1888, "Cinema só existe desde 1888")
        .max(MAX_YEAR, `Use um ano até ${MAX_YEAR}`),
    ),
  recommendation_min_rating: z.coerce
    .number({ invalid_type_error: "Selecione uma nota válida" })
    .min(0, "A nota mínima é 0")
    .max(5, "A nota máxima é 5"),
  recommendation_max_runtime: z
    .union([z.null(), z.literal("")])
    .or(
      z.coerce
        .number({ invalid_type_error: "Use apenas números" })
        .int("Duração deve ser um número inteiro")
        .min(30, "Mínimo de 30 minutos")
        .max(600, "Máximo de 600 minutos"),
    ),
});

function validateForm(form) {
  const result = recommendationSchema.safeParse({
    recommendation_min_year: form.recommendation_min_year ?? "",
    recommendation_min_rating: form.recommendation_min_rating ?? 0,
    recommendation_max_runtime: form.recommendation_max_runtime ?? "",
  });
  if (result.success) return {};
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

// ─── Layout primitives ────────────────────────────────────
function Section({ icon, title, subtitle, children, isMobile }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.bgCard}, rgba(15,25,35,0.92))`,
        border: `1px solid rgba(201,168,76,0.18)`,
        borderRadius: 18,
        padding: isMobile ? 18 : 24,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14, background: `${C.gold}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.gold, flexShrink: 0,
        }}>{icon}</div>
        <div>
          <h2 style={{ color: C.text, fontSize: 17, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{title}</h2>
          {subtitle && <p style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display: "grid", gap: 16 }}>{children}</div>
    </div>
  );
}

function CollapsibleCard({ icon, title, summary, open, onToggle, children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${open ? C.gold + "55" : C.border}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          color: C.text,
          cursor: "pointer",
          textAlign: "left",
          minHeight: "unset",
        }}
      >
        <span style={{
          width: 32, height: 32, borderRadius: 10, background: `${C.gold}15`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.gold, flexShrink: 0,
        }}>{icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{title}</span>
          {summary && (
            <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: C.textMuted,
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && (
        <div style={{ padding: "4px 16px 18px", display: "grid", gap: 14, borderTop: `1px solid ${C.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{label}</span>
      {children}
      {error ? (
        <span style={{ color: C.red, fontSize: 11.5, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 5 }}>
          <AlertCircle size={12} /> {error}
        </span>
      ) : (
        hint && <span style={{ color: C.textMuted, fontSize: 11.5, lineHeight: 1.5 }}>{hint}</span>
      )}
    </label>
  );
}

function ToggleRow({ label, hint, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: C.text, fontSize: 13.5, fontWeight: 700 }}>{label}</p>
        {hint && <p style={{ color: C.textMuted, fontSize: 11.5, marginTop: 3, lineHeight: 1.5 }}>{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        style={{
          width: 46, height: 26, borderRadius: 999,
          background: value ? C.gold : "rgba(255,255,255,0.12)",
          border: "none", position: "relative", cursor: "pointer",
          transition: "background 0.2s", flexShrink: 0, padding: 0,
          minHeight: "unset", minWidth: "unset",
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: value ? 23 : 3,
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }} />
      </button>
    </div>
  );
}

function ChipGroup({ options, selected, onToggle, getKey, getLabel }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const key = getKey(opt);
        const active = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            style={{
              padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
              cursor: "pointer",
              background: active ? `${C.gold}26` : "rgba(255,255,255,0.05)",
              color: active ? C.gold : C.textMuted,
              border: `1px solid ${active ? C.gold : "rgba(255,255,255,0.1)"}`,
              transition: "all 0.15s", minHeight: "unset",
            }}
          >
            {getLabel(opt)}
          </button>
        );
      })}
    </div>
  );
}

const baseInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  background: C.bgDeep,
  border: `1px solid ${C.border}`,
  color: C.text,
  outline: "none",
  fontSize: 15,
};

// ─── Resumo em linguagem natural ──────────────────────────
function buildPreviewText(form) {
  const parts = [];
  if (form.recommendation_min_year) parts.push(`a partir de ${form.recommendation_min_year}`);
  const minR = Number(form.recommendation_min_rating || 0);
  if (minR > 0) parts.push(`com nota MovieClub ≥ ${minR.toFixed(1)}`);
  if (form.recommendation_max_runtime) parts.push(`até ${form.recommendation_max_runtime} min`);
  if (form.hide_unrated_recommendations) parts.push("ocultando filmes sem nota suficiente");
  const langs = form.preferred_languages || [];
  if (langs.length) {
    const labels = langs.map((c) => LANGUAGE_OPTIONS.find((l) => l.code === c)?.label || c);
    parts.push(`em ${labels.join(", ")}`);
  }
  const exc = form.excluded_genres || [];
  if (exc.length) parts.push(`excluindo ${exc.join(", ")}`);
  if (form.show_adult_content) parts.push("incluindo conteúdo adulto");
  return parts.length ? `Mostrando filmes ${parts.join(", ")}.` : "Sem filtros ativos — todas as recomendações aparecerão.";
}

function summaryFor(card, form) {
  if (card === "period") {
    const bits = [];
    if (form.recommendation_min_year) bits.push(`≥ ${form.recommendation_min_year}`);
    const r = Number(form.recommendation_min_rating || 0);
    if (r > 0) bits.push(`≥ ${r.toFixed(1)}★`);
    return bits.length ? bits.join(" · ") : "Sem restrições";
  }
  if (card === "duration") {
    const bits = [];
    if (form.recommendation_max_runtime) bits.push(`até ${form.recommendation_max_runtime} min`);
    if (form.hide_unrated_recommendations) bits.push("sem filmes sem nota");
    return bits.length ? bits.join(" · ") : "Sem restrições";
  }
  if (card === "languages") {
    const n = (form.preferred_languages || []).length;
    return n ? `${n} idioma${n > 1 ? "s" : ""}` : "Todos os idiomas";
  }
  if (card === "genres") {
    const n = (form.excluded_genres || []).length;
    return n ? `${n} gênero${n > 1 ? "s" : ""} excluído${n > 1 ? "s" : ""}` : "Nenhum excluído";
  }
  return "";
}

// ─────────────────────────────────────────────────────────
export function SettingsPage({ auth, isMobile }) {
  const { preferences, loading, savePreferences } = useUserPreferences(auth?.user?.id);
  const [form, setForm] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [openCard, setOpenCard] = useState("period");

  useEffect(() => {
    setForm(preferences);
  }, [preferences]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleArray = (key, value) =>
    setForm((f) => {
      const cur = f[key] || [];
      return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  const toggleCard = (k) => setOpenCard((cur) => (cur === k ? null : k));

  const errors = useMemo(() => validateForm(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(preferences), [form, preferences]);
  const previewText = useMemo(() => buildPreviewText(form), [form]);

  const handleSave = async () => {
    if (hasErrors) {
      toast.error("Corrija os campos destacados antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      await savePreferences(form);
      toast.success("Preferências salvas com sucesso");
    } catch (e) {
      toast.error(e?.message || "Erro ao salvar preferências");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setForm(preferences);

  // Verifica se algum filtro de recomendação está diferente do default
  const recommendationsActive = useMemo(() => {
    return Object.entries(RECOMMENDATION_DEFAULTS).some(([key, def]) => {
      const cur = form?.[key];
      if (Array.isArray(def)) return (cur || []).length > 0;
      if (def === null) return cur !== null && cur !== undefined && cur !== "";
      return cur !== def;
    });
  }, [form]);

  const handleClearRecommendations = () => {
    setForm((f) => ({ ...f, ...RECOMMENDATION_DEFAULTS }));
    toast.success("Filtros de recomendação limpos. Clique em Salvar para confirmar.");
  };

  return (
    <div style={{ paddingTop: isMobile ? 24 : 80, paddingBottom: 120 }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: isMobile ? "0 16px" : "0 28px" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: C.gold, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Preferências do app
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: isMobile ? 28 : 34, fontWeight: 900, color: C.text, marginBottom: 8 }}>
            Configurações
          </h1>
          <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7 }}>
            Personalize como o MovieClub funciona para você. As escolhas ficam salvas na sua conta e valem em todos os dispositivos.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spinner />
          </div>
        ) : (
          <>
            {/* RECOMENDAÇÕES */}
            <Section
              icon={<Sparkles size={21} />}
              title="Recomendações"
              subtitle="Usado em “Recomendados para Você” e no Quick Rate."
              isMobile={isMobile}
            >
              {/* Pré-visualização do filtro */}
              <div
                style={{
                  background: `${C.gold}10`,
                  border: `1px solid ${C.gold}40`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Sparkles size={16} style={{ color: C.gold, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ color: C.gold, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    Pré-visualização do filtro
                  </p>
                  <p style={{ color: C.text, fontSize: 13, lineHeight: 1.55 }}>{previewText}</p>
                </div>
              </div>

              {/* Cards colapsáveis */}
              <CollapsibleCard
                icon={<Calendar size={17} />}
                title="Período & nota"
                summary={summaryFor("period", form)}
                open={openCard === "period"}
                onToggle={() => toggleCard("period")}
              >
                <Field
                  label="Ano mínimo dos filmes"
                  hint={`Filmes lançados antes desse ano não serão recomendados. Aceito: 1888 a ${MAX_YEAR}.`}
                  error={errors.recommendation_min_year}
                >
                  <input
                    inputMode="numeric"
                    placeholder="Sem filtro"
                    value={form.recommendation_min_year ?? ""}
                    onChange={(e) =>
                      update({
                        recommendation_min_year:
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 4) || null,
                      })
                    }
                    style={{
                      ...baseInputStyle,
                      borderColor: errors.recommendation_min_year ? C.red : C.border,
                    }}
                  />
                </Field>

                <Field label="Nota mínima MovieClub" error={errors.recommendation_min_rating}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={Number(form.recommendation_min_rating || 0)}
                      onChange={(e) => update({ recommendation_min_rating: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: C.gold }}
                    />
                    <strong style={{ color: C.gold, fontSize: 22, fontFamily: "'Outfit', sans-serif", minWidth: 48, textAlign: "right" }}>
                      {Number(form.recommendation_min_rating || 0).toFixed(1)}
                    </strong>
                  </div>
                </Field>
              </CollapsibleCard>

              <CollapsibleCard
                icon={<Clock size={17} />}
                title="Duração & qualidade"
                summary={summaryFor("duration", form)}
                open={openCard === "duration"}
                onToggle={() => toggleCard("duration")}
              >
                <Field
                  label="Duração máxima (minutos)"
                  hint="Filtra recomendações longas demais. Aceito: 30 a 600 minutos."
                  error={errors.recommendation_max_runtime}
                >
                  <input
                    inputMode="numeric"
                    placeholder="Sem limite"
                    value={form.recommendation_max_runtime ?? ""}
                    onChange={(e) =>
                      update({
                        recommendation_max_runtime:
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 4) || null,
                      })
                    }
                    style={{
                      ...baseInputStyle,
                      borderColor: errors.recommendation_max_runtime ? C.red : C.border,
                    }}
                  />
                </Field>
                <ToggleRow
                  label="Ocultar filmes sem nota"
                  hint="Não recomenda filmes que ainda não receberam avaliações suficientes."
                  value={!!form.hide_unrated_recommendations}
                  onChange={(v) => update({ hide_unrated_recommendations: v })}
                />
              </CollapsibleCard>

              <CollapsibleCard
                icon={<Languages size={17} />}
                title="Idiomas preferidos"
                summary={summaryFor("languages", form)}
                open={openCard === "languages"}
                onToggle={() => toggleCard("languages")}
              >
                <Field hint="Recomenda apenas filmes nesses idiomas. Sem nada selecionado = todos.">
                  <ChipGroup
                    options={LANGUAGE_OPTIONS}
                    selected={form.preferred_languages || []}
                    onToggle={(v) => toggleArray("preferred_languages", v)}
                    getKey={(o) => o.code}
                    getLabel={(o) => o.label}
                  />
                </Field>
              </CollapsibleCard>

              <CollapsibleCard
                icon={<Tags size={17} />}
                title="Gêneros excluídos"
                summary={summaryFor("genres", form)}
                open={openCard === "genres"}
                onToggle={() => toggleCard("genres")}
              >
                <Field hint="Esses gêneros nunca aparecerão nas recomendações.">
                  <ChipGroup
                    options={GENRE_OPTIONS}
                    selected={form.excluded_genres || []}
                    onToggle={(v) => toggleArray("excluded_genres", v)}
                    getKey={(o) => o}
                    getLabel={(o) => o}
                  />
                </Field>
              </CollapsibleCard>
            </Section>

            {/* APARÊNCIA */}
            <Section icon={<LayoutGrid size={21} />} title="Aparência e navegação" subtitle="Como o app se apresenta para você." isMobile={isMobile}>
              <Field label="Visualização padrão dos filmes" hint="Aplicada em busca e perfil ao abrir o app.">
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ k: "grid", l: "Grade" }, { k: "list", l: "Lista" }].map(({ k, l }) => {
                    const active = form.default_view === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => update({ default_view: k })}
                        style={{
                          flex: 1, padding: "11px 14px", borderRadius: 12,
                          background: active ? `${C.gold}22` : "rgba(255,255,255,0.04)",
                          color: active ? C.gold : C.text,
                          border: `1px solid ${active ? C.gold : C.border}`,
                          fontWeight: 700, fontSize: 14, cursor: "pointer", minHeight: "unset",
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <ToggleRow
                label="Modo compacto"
                hint="Reduz espaçamento e tamanhos para mostrar mais conteúdo na tela."
                value={!!form.compact_mode}
                onChange={(v) => update({ compact_mode: v })}
              />
            </Section>

            {/* CONTEÚDO */}
            <Section icon={<Film size={21} />} title="Conteúdo e mídia" subtitle="Trailers, spoilers e conteúdo adulto." isMobile={isMobile}>
              <ToggleRow
                label="Reproduzir trailers automaticamente"
                hint="Toca o trailer assim que você abre os detalhes do filme."
                value={!!form.auto_play_trailers}
                onChange={(v) => update({ auto_play_trailers: v })}
              />
              <ToggleRow
                label="Ocultar sinopses (anti-spoiler)"
                hint="Esconde a sinopse atrás de um clique para evitar spoilers."
                value={!!form.hide_spoilers}
                onChange={(v) => update({ hide_spoilers: v })}
              />
              <ToggleRow
                label="Mostrar conteúdo adulto"
                hint="Inclui filmes classificados como adultos nos resultados."
                value={!!form.show_adult_content}
                onChange={(v) => update({ show_adult_content: v })}
              />
            </Section>

            {/* QUICK RATE */}
            <Section icon={<Zap size={21} />} title="Quick Rate" subtitle="Como o modo de avaliação rápida começa." isMobile={isMobile}>
              <Field label="Modo padrão ao abrir" hint="O modo escolhido aparece destacado no Quick Rate.">
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { k: "random", l: "Aleatório" },
                    { k: "recommended", l: "Recomendados" },
                  ].map(({ k, l }) => {
                    const active = form.quick_rate_default_mode === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => update({ quick_rate_default_mode: k })}
                        style={{
                          flex: 1, padding: "11px 14px", borderRadius: 12,
                          background: active ? `${C.gold}22` : "rgba(255,255,255,0.04)",
                          color: active ? C.gold : C.text,
                          border: `1px solid ${active ? C.gold : C.border}`,
                          fontWeight: 700, fontSize: 14, cursor: "pointer", minHeight: "unset",
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Section>

            {/* STREAMING */}
            <Section icon={<Globe size={21} />} title="Streaming" subtitle="Onde você quer ver as opções de “onde assistir”." isMobile={isMobile}>
              <Field label="Sua região" hint="Define o catálogo de streaming exibido nos detalhes dos filmes.">
                <select
                  value={form.streaming_region || "BR"}
                  onChange={(e) => update({ streaming_region: e.target.value })}
                  style={{ ...baseInputStyle, appearance: "none" }}
                >
                  {REGION_OPTIONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </Field>
            </Section>

            {/* PRIVACIDADE */}
            <Section icon={<Shield size={21} />} title="Privacidade" subtitle="Quem pode ver suas atividades e perfil." isMobile={isMobile}>
              <Field label="Visibilidade do perfil">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { k: "public", l: "Público" },
                    { k: "friends", l: "Só amigos" },
                    { k: "private", l: "Privado" },
                  ].map(({ k, l }) => {
                    const active = form.profile_visibility === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => update({ profile_visibility: k })}
                        style={{
                          flex: 1, minWidth: 100, padding: "11px 14px", borderRadius: 12,
                          background: active ? `${C.gold}22` : "rgba(255,255,255,0.04)",
                          color: active ? C.gold : C.text,
                          border: `1px solid ${active ? C.gold : C.border}`,
                          fontWeight: 700, fontSize: 13.5, cursor: "pointer", minHeight: "unset",
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Section>

            {/* NOTIFICAÇÕES */}
            <Section icon={<Bell size={21} />} title="Notificações" subtitle="O que aparece nos seus avisos." isMobile={isMobile}>
              <ToggleRow
                label="Atividade de amigos"
                hint="Avisos quando amigos avaliam ou adicionam filmes."
                value={!!form.notify_friend_activity}
                onChange={(v) => update({ notify_friend_activity: v })}
              />
              <ToggleRow
                label="Atividade de clubes"
                hint="Avisos sobre filmes adicionados nos seus clubes."
                value={!!form.notify_club_activity}
                onChange={(v) => update({ notify_club_activity: v })}
              />
            </Section>

            {/* BARRA DE AÇÕES */}
            <div
              style={{
                position: "sticky",
                bottom: isMobile ? 80 : 16,
                display: "flex",
                gap: 10,
                padding: 12,
                background: "rgba(15,25,35,0.95)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${hasErrors ? C.red + "55" : C.border}`,
                borderRadius: 16,
                marginTop: 8,
                boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              }}
            >
              <Btn variant="ghost" onClick={handleReset} disabled={!dirty || saving}>
                <RotateCcw size={14} /> Descartar
              </Btn>
              <Btn variant="gold" onClick={handleSave} disabled={!dirty || saving || hasErrors} style={{ flex: 1 }}>
                {saving ? <><Spinner size={14} /> Salvando…</> : <><Save size={15} /> Salvar alterações</>}
              </Btn>
            </div>
            {hasErrors && (
              <p style={{ marginTop: 10, color: C.red, fontSize: 12, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <AlertCircle size={13} /> Corrija os campos destacados para poder salvar.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
