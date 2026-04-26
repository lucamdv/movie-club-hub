// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { C } from "../foundation";
import { Spinner, Btn } from "../ui";
import { useUserPreferences } from "../hooks";
import {
  Calendar,
  SlidersHorizontal,
  Star,
  Sparkles,
  LayoutGrid,
  Clock,
  Globe,
  Film,
  Bell,
  EyeOff,
  Shield,
  Save,
  RotateCcw,
  PlayCircle,
  Zap,
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
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: `${C.gold}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.gold,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <h2 style={{ color: C.text, fontSize: 17, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            {title}
          </h2>
          {subtitle && <p style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display: "grid", gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{label}</span>
      {children}
      {hint && <span style={{ color: C.textMuted, fontSize: 11.5, lineHeight: 1.5 }}>{hint}</span>}
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
          width: 46,
          height: 26,
          borderRadius: 999,
          background: value ? C.gold : "rgba(255,255,255,0.12)",
          border: "none",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
          flexShrink: 0,
          padding: 0,
          minHeight: "unset",
          minWidth: "unset",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 23 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        />
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
              padding: "7px 13px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              background: active ? `${C.gold}26` : "rgba(255,255,255,0.05)",
              color: active ? C.gold : C.textMuted,
              border: `1px solid ${active ? C.gold : "rgba(255,255,255,0.1)"}`,
              transition: "all 0.15s",
              minHeight: "unset",
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

export function SettingsPage({ auth, isMobile }) {
  const { preferences, loading, savePreferences } = useUserPreferences(auth?.user?.id);
  const [form, setForm] = useState(preferences);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(preferences);
  }, [preferences]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleArray = (key, value) =>
    setForm((f) => {
      const cur = f[key] || [];
      return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(preferences), [form, preferences]);

  const handleSave = async () => {
    const year = form.recommendation_min_year;
    if (year && (Number(year) < 1888 || Number(year) > 2100)) {
      toast.error("Escolha um ano entre 1888 e 2100");
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
              <Field label="Ano mínimo dos filmes" hint="Filmes lançados antes desse ano não serão recomendados. Deixe vazio para sem filtro.">
                <input
                  inputMode="numeric"
                  placeholder="Sem filtro"
                  value={form.recommendation_min_year ?? ""}
                  onChange={(e) => update({ recommendation_min_year: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) || null })}
                  style={baseInputStyle}
                />
              </Field>

              <Field label="Nota mínima MovieClub">
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

              <Field label="Duração máxima (minutos)" hint="Filtra recomendações longas demais. Deixe vazio para sem limite.">
                <input
                  inputMode="numeric"
                  placeholder="Sem limite"
                  value={form.recommendation_max_runtime ?? ""}
                  onChange={(e) => update({ recommendation_max_runtime: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) || null })}
                  style={baseInputStyle}
                />
              </Field>

              <Field label="Idiomas preferidos" hint="Recomenda apenas filmes nesses idiomas. Sem nada selecionado = todos.">
                <ChipGroup
                  options={LANGUAGE_OPTIONS}
                  selected={form.preferred_languages || []}
                  onToggle={(v) => toggleArray("preferred_languages", v)}
                  getKey={(o) => o.code}
                  getLabel={(o) => o.label}
                />
              </Field>

              <Field label="Gêneros a excluir" hint="Esses gêneros nunca aparecerão nas recomendações.">
                <ChipGroup
                  options={GENRE_OPTIONS}
                  selected={form.excluded_genres || []}
                  onToggle={(v) => toggleArray("excluded_genres", v)}
                  getKey={(o) => o}
                  getLabel={(o) => o}
                />
              </Field>

              <ToggleRow
                label="Ocultar filmes sem nota"
                hint="Não recomenda filmes que ainda não receberam avaliações suficientes."
                value={!!form.hide_unrated_recommendations}
                onChange={(v) => update({ hide_unrated_recommendations: v })}
              />
            </Section>

            {/* APARÊNCIA */}
            <Section
              icon={<LayoutGrid size={21} />}
              title="Aparência e navegação"
              subtitle="Como o app se apresenta para você."
              isMobile={isMobile}
            >
              <Field label="Visualização padrão dos filmes">
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ k: "grid", l: "Grade" }, { k: "list", l: "Lista" }].map(({ k, l }) => {
                    const active = form.default_view === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => update({ default_view: k })}
                        style={{
                          flex: 1,
                          padding: "11px 14px",
                          borderRadius: 12,
                          background: active ? `${C.gold}22` : "rgba(255,255,255,0.04)",
                          color: active ? C.gold : C.text,
                          border: `1px solid ${active ? C.gold : C.border}`,
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: "pointer",
                          minHeight: "unset",
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
            <Section
              icon={<Film size={21} />}
              title="Conteúdo e mídia"
              subtitle="Trailers, spoilers e conteúdo adulto."
              isMobile={isMobile}
            >
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
            <Section
              icon={<Zap size={21} />}
              title="Quick Rate"
              subtitle="Como o modo de avaliação rápida começa."
              isMobile={isMobile}
            >
              <Field label="Modo padrão ao abrir">
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
                          flex: 1,
                          padding: "11px 14px",
                          borderRadius: 12,
                          background: active ? `${C.gold}22` : "rgba(255,255,255,0.04)",
                          color: active ? C.gold : C.text,
                          border: `1px solid ${active ? C.gold : C.border}`,
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: "pointer",
                          minHeight: "unset",
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
            <Section
              icon={<Globe size={21} />}
              title="Streaming"
              subtitle="Onde você quer ver as opções de “onde assistir”."
              isMobile={isMobile}
            >
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
            <Section
              icon={<Shield size={21} />}
              title="Privacidade"
              subtitle="Quem pode ver suas atividades e perfil."
              isMobile={isMobile}
            >
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
                          flex: 1,
                          minWidth: 100,
                          padding: "11px 14px",
                          borderRadius: 12,
                          background: active ? `${C.gold}22` : "rgba(255,255,255,0.04)",
                          color: active ? C.gold : C.text,
                          border: `1px solid ${active ? C.gold : C.border}`,
                          fontWeight: 700,
                          fontSize: 13.5,
                          cursor: "pointer",
                          minHeight: "unset",
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
            <Section
              icon={<Bell size={21} />}
              title="Notificações"
              subtitle="O que aparece nos seus avisos."
              isMobile={isMobile}
            >
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
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                marginTop: 8,
                boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              }}
            >
              <Btn variant="ghost" onClick={handleReset} disabled={!dirty || saving}>
                <RotateCcw size={14} /> Descartar
              </Btn>
              <Btn variant="gold" onClick={handleSave} disabled={!dirty || saving} style={{ flex: 1 }}>
                {saving ? <><Spinner size={14} /> Salvando…</> : <><Save size={15} /> Salvar alterações</>}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
