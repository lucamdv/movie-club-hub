// @ts-nocheck
import { useState } from "react";
import { toast } from "sonner";
import { C, resolveAvatarUrl } from "../foundation";
import { Film, Link2, Sparkles, Users, ArrowRight, Ticket, Plus, X, ChevronRight, Crown, Calendar } from "lucide-react";
import { Spinner, Btn, TextInput, MiniPoster } from "../ui";
import { useClubs } from "../hooks";
import mascotCrew from "@/assets/monkey-crew.png";
import mascotDirector from "@/assets/monkey-director.png";

export function GroupsPage({ setPage, setSelectedGroup, auth: authCtx }) {
  const userId = authCtx?.user?.id;
  const { clubs, loading, invites, createClub, joinByCode, acceptInvite, declineInvite } = useClubs(userId);
  const [mode, setMode] = useState(null); // null | "create" | "join"
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao seu club"); return; }
    setCreating(true);
    try {
      await createClub(name.trim(), desc.trim() || null);
      toast.success("Club criado!");
      setName(""); setDesc(""); setMode(null);
    } catch (e) { toast.error("Erro ao criar club"); }
    setCreating(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      let code = joinCode.trim();
      if (code.includes("club=")) code = new URL(code).searchParams.get("club") || code;
      await joinByCode(code);
      toast.success("Você entrou no club!");
      setJoinCode(""); setMode(null);
    } catch (e) { toast.error(e.message || "Erro ao entrar no club"); }
  };

  return (
    <div className="clubs-page" style={{ paddingTop: 72, paddingBottom: 110, minHeight: "100dvh", background: C.bg, position: "relative", overflow: "hidden" }}>
      {/* Ambient glow background */}
      <div aria-hidden style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 720, height: 720, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}22, transparent 60%)`, filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "absolute", bottom: -200, right: -120, width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, #4f46e522, transparent 65%)`, filter: "blur(70px)", pointerEvents: "none", zIndex: 0 }} />

      <div className="clubs-container" style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "0 16px" }}>

        {/* ── HERO MARQUEE ── */}
        <div className="clubs-hero" style={{
          position: "relative",
          background: `linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(15,25,35,0.4) 50%, rgba(79,70,229,0.12) 100%)`,
          border: `1px solid rgba(201,168,76,0.28)`,
          borderRadius: 28,
          padding: "28px 22px",
          marginBottom: 28,
          overflow: "hidden",
        }}>
          {/* film-strip top edge */}
          <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: `repeating-linear-gradient(90deg, transparent 0 12px, rgba(201,168,76,0.45) 12px 16px)`, opacity: 0.7 }} />
          {/* film-strip bottom edge */}
          <div aria-hidden style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 14, background: `repeating-linear-gradient(90deg, transparent 0 12px, rgba(201,168,76,0.45) 12px 16px)`, opacity: 0.7 }} />

          <div className="clubs-hero-row" style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <img src={mascotCrew} alt="" className="clubs-hero-mascot" style={{ width: 110, height: 110, objectFit: "contain", filter: `drop-shadow(0 8px 24px ${C.gold}66)`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `rgba(201,168,76,0.15)`, border: `1px solid rgba(201,168,76,0.35)`, marginBottom: 10 }}>
                <Sparkles size={11} style={{ color: C.gold }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cinema em grupo</span>
              </div>
              <h1 className="clubs-hero-title" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 900, color: C.text, marginBottom: 6, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
                Seus <span style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Clubs</span>
              </h1>
              <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>Curadorias colaborativas. Você e seus amigos, montando uma watchlist juntos.</p>
            </div>
          </div>

          {/* Quick stats strip */}
          {!loading && (
            <div className="clubs-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 22 }}>
              <Stat label="Clubs" value={clubs.length} icon={<Ticket size={13} />} />
              <Stat label="Filmes" value={clubs.reduce((s, c) => s + (c.movieCount || 0), 0)} icon={<Film size={13} />} />
              <Stat label="Convites" value={invites.length} icon={<Users size={13} />} accent={invites.length > 0} />
            </div>
          )}
        </div>

        {/* ── ACTION DUO: Create + Join ── */}
        <div className="clubs-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          <ActionCard
            active={mode === "create"}
            onClick={() => setMode(mode === "create" ? null : "create")}
            icon={<Plus size={22} />}
            title="Criar Club"
            subtitle="Comece sua curadoria"
            gradient={`linear-gradient(135deg, ${C.gold}, ${C.goldLight})`}
            primary
          />
          <ActionCard
            active={mode === "join"}
            onClick={() => setMode(mode === "join" ? null : "join")}
            icon={<Link2 size={22} />}
            title="Entrar"
            subtitle="Use um código ou link"
            gradient={`linear-gradient(135deg, #4f46e5, #7c3aed)`}
          />
        </div>

        {/* Inline expandable forms */}
        {mode === "create" && (
          <div className="clubs-form" style={{ background: C.bgCard, border: `1px solid ${C.gold}`, borderRadius: 20, padding: 22, marginBottom: 28, boxShadow: `0 14px 40px rgba(201,168,76,0.18)`, animation: "fadeInUp 0.25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>Novo Club</h3>
              <button onClick={() => setMode(null)} style={{ width: 28, height: 28, borderRadius: "50%", background: C.bgDeep, border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}><X size={14} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <TextInput label="Nome do Club" value={name} onChange={setName} placeholder="Ex: Cinéphiles de Sexta" />
              <TextInput label="Descrição (opcional)" value={desc} onChange={setDesc} placeholder="Do que se trata esse club?" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <Btn variant="gold" size="sm" onClick={handleCreate} disabled={creating}>{creating ? <Spinner size={14} /> : <>Criar Club <ArrowRight size={13} /></>}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setMode(null)}>Cancelar</Btn>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="clubs-form" style={{ background: C.bgCard, border: `1px solid #7c3aed`, borderRadius: 20, padding: 22, marginBottom: 28, boxShadow: `0 14px 40px rgba(124,58,237,0.18)`, animation: "fadeInUp 0.25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>Entrar em um Club</h3>
              <button onClick={() => setMode(null)} style={{ width: 28, height: 28, borderRadius: "50%", background: C.bgDeep, border: `1px solid ${C.border}`, color: C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "unset", minWidth: "unset" }}><X size={14} /></button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Cole o link ou código do club..."
                autoFocus
                style={{ flex: 1, padding: "12px 14px", borderRadius: 10, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
                onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              />
              <Btn variant="gold" size="sm" onClick={handleJoin} disabled={!joinCode.trim()}>Entrar</Btn>
            </div>
          </div>
        )}

        {/* ── INVITES ── */}
        {invites.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, boxShadow: `0 0 12px ${C.gold}`, animation: "pulseGlow 1.6s ease-in-out infinite" }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase" }}>Convites pendentes ({invites.length})</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {invites.map((inv) => (
                <div key={inv.id} style={{ background: `linear-gradient(135deg, ${C.bgCard}, rgba(201,168,76,0.06))`, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Ticket size={20} style={{ color: C.bgDeep }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{inv.clubs?.name || "Club"}</p>
                      <p style={{ fontSize: 11, color: C.textMuted }}>Você foi convidado para este club</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="gold" size="sm" onClick={() => acceptInvite(inv.id, inv.club_id)}>Aceitar</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => declineInvite(inv.id)}>Recusar</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CLUBS LIST ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
        ) : clubs.length > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Crown size={14} style={{ color: C.gold }} />
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Suas curadorias</h2>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)` }} />
            </div>
            <div className="clubs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {clubs.map((club, idx) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  userId={userId}
                  onClick={() => { setSelectedGroup(club); setPage("group"); }}
                  index={idx}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyClubs onCreate={() => setMode("create")} />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function Stat({ label, value, icon, accent }) {
  return (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)` : "rgba(15,25,35,0.5)",
      border: `1px solid ${accent ? `${C.gold}55` : "rgba(255,255,255,0.06)"}`,
      borderRadius: 14,
      padding: "12px 14px",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: accent ? C.gold : C.textDim, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: accent ? C.gold : C.text, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function ActionCard({ icon, title, subtitle, onClick, active, gradient, primary }) {
  return (
    <button
      onClick={onClick}
      className="club-action-card"
      style={{
        position: "relative",
        padding: "18px 16px",
        borderRadius: 18,
        background: active ? gradient : C.bgCard,
        border: active ? "none" : `1px solid ${C.border}`,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        minHeight: 92,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: active ? `0 14px 40px ${primary ? "rgba(201,168,76,0.35)" : "rgba(124,58,237,0.35)"}` : "none",
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: active ? "rgba(15,25,35,0.25)" : (primary ? `${C.gold}22` : `rgba(124,58,237,0.18)`),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? C.bgDeep : (primary ? C.gold : "#a78bfa"),
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: active ? C.bgDeep : C.text, marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 11, color: active ? `${C.bgDeep}cc` : C.textMuted }}>{subtitle}</p>
      </div>
    </button>
  );
}

function ClubCard({ club, userId, onClick, index }) {
  const isOwner = club.created_by === userId;
  const posters = (club.movieIds || []).slice(0, 4);
  const lastMember = club.members?.[club.members.length - 1];

  return (
    <div
      onClick={onClick}
      className="club-card-3d"
      style={{
        position: "relative",
        background: `linear-gradient(155deg, ${C.bgCard} 0%, rgba(15,25,35,0.95) 100%)`,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight: 280,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Poster mosaic header */}
      <div style={{ position: "relative", height: 140, overflow: "hidden", background: C.bgDeep }}>
        {posters.length > 0 ? (
          <>
            {/* Diagonal poster stack */}
            <div style={{ position: "absolute", inset: 0, display: "flex", gap: 0 }}>
              {posters.map((id, i) => (
                <div
                  key={id}
                  className="club-poster-tile"
                  style={{
                    flex: 1,
                    position: "relative",
                    transform: `translateY(${i * -2}px)`,
                    transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <MiniPoster tmdbId={id} />
                </div>
              ))}
            </div>
            {/* Cinematic overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(180deg, rgba(15,25,35,0) 30%, rgba(15,25,35,0.6) 75%, ${C.bgCard} 100%)`,
              pointerEvents: "none",
            }} />
          </>
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, rgba(201,168,76,0.08), rgba(15,25,35,0.4))`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Film size={42} style={{ color: "#3a4a60", opacity: 0.6 }} />
          </div>
        )}

        {/* Owner badge */}
        {isOwner && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            padding: "4px 9px", borderRadius: 999,
            background: "rgba(15,25,35,0.85)", backdropFilter: "blur(8px)",
            border: `1px solid ${C.gold}66`,
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 9, fontWeight: 800, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            <Crown size={9} /> Dono
          </div>
        )}

        {/* Movie count chip */}
        {club.movieCount > 0 && (
          <div style={{
            position: "absolute", top: 12, left: 12,
            padding: "4px 9px", borderRadius: 999,
            background: "rgba(15,25,35,0.85)", backdropFilter: "blur(8px)",
            border: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, fontWeight: 700, color: C.text,
          }}>
            <Film size={10} /> {club.movieCount}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{club.name}</h3>
        {club.description ? (
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{club.description}</p>
        ) : (
          <p style={{ fontSize: 12, color: C.textDim, marginBottom: 14, fontStyle: "italic" }}>Sem descrição</p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {/* Members avatar stack */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {club.members.slice(0, 4).map((m, i) => {
              const ini = (m.profile?.display_name || "?").slice(0, 2).toUpperCase();
              return (
                <div key={m.user_id} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: 4 - i, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.bgDeep, background: m.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.bgCard}`, overflow: "hidden" }}>
                  {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
                </div>
              );
            })}
            {club.members.length > 4 && (
              <div style={{ marginLeft: -10, width: 28, height: 28, borderRadius: "50%", background: C.bgDeep, border: `2px solid ${C.bgCard}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.textMuted }}>
                +{club.members.length - 4}
              </div>
            )}
            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 10 }}>{club.members.length}</span>
          </div>

          <div className="club-card-cta" style={{ display: "flex", alignItems: "center", gap: 4, color: C.gold, fontSize: 12, fontWeight: 700, transition: "transform 0.2s" }}>
            Abrir <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyClubs({ onCreate }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", background: C.bgCard, border: `1px dashed ${C.border}`, borderRadius: 24, position: "relative", overflow: "hidden" }}>
      <img src={mascotDirector} alt="" style={{ width: 130, height: 130, objectFit: "contain", marginBottom: 18, filter: `drop-shadow(0 8px 24px ${C.gold}33)` }} />
      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>Sem clubs ainda</h3>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 22, maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.6 }}>
        Monte sua primeira curadoria coletiva. Convide amigos, adicionem filmes juntos e descubram o gosto cinéfilo do grupo.
      </p>
      <Btn variant="gold" onClick={onCreate}><Plus size={14} /> Criar meu primeiro Club</Btn>
    </div>
  );
}
