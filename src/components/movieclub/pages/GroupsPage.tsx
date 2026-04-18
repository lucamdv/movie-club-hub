// @ts-nocheck
import { useState } from "react";
import { toast } from "sonner";
import { C } from "../foundation";
import { Film, Link2 } from "lucide-react";
import { Spinner, Btn, TextInput, MiniPoster } from "../ui";
import { useClubs } from "../hooks";
import { PlusIcon } from "../ui";

export function GroupsPage({ setPage, setSelectedGroup, auth: authCtx }) {
  const userId = authCtx?.user?.id;
  const { clubs, loading, invites, createClub, joinByCode, acceptInvite, declineInvite } = useClubs(userId);
  const [showCreate, setShowCreate] = useState(false);
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
      setName(""); setDesc(""); setShowCreate(false);
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
      setJoinCode("");
    } catch (e) { toast.error(e.message || "Erro ao entrar no club"); }
  };

  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              Meus <span style={{ color: C.gold }}>Clubs</span>
            </h1>
            <p style={{ color: C.textMuted, fontSize: 13 }}>Listas colaborativas com seus amigos</p>
          </div>
          <Btn variant="gold" onClick={() => setShowCreate(true)}><PlusIcon /> Criar Club</Btn>
        </div>

        {invites.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 12 }}>Convites Pendentes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {invites.map((inv) => (
                <div key={inv.id} style={{ background: C.bgCard, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{inv.clubs?.name || "Club"}</p>
                    <p style={{ fontSize: 11, color: C.textMuted }}>Você foi convidado para este club</p>
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

        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Link2 size={14} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Entrar em um Club</h3>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Cole o link ou código do club..."
              style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = C.gold)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
            />
            <Btn variant="gold" size="sm" onClick={handleJoin} disabled={!joinCode.trim()}>Entrar</Btn>
          </div>
        </div>

        {showCreate && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.gold}`, borderRadius: 16, padding: 24, marginBottom: 22, animation: "fadeIn 0.2s ease" }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, color: C.text, marginBottom: 16 }}>Novo Club</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <TextInput label="Nome do Club" value={name} onChange={setName} placeholder="Ex: Cinéphiles de Sexta" />
              <TextInput label="Descrição (opcional)" value={desc} onChange={setDesc} placeholder="Do que se trata esse club?" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Btn variant="gold" size="sm" onClick={handleCreate} disabled={creating}>{creating ? <Spinner size={14} /> : "Criar"}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Btn>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={32} /></div>
        ) : clubs.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {clubs.map((club) => (
              <div
                key={club.id}
                className="card-hover"
                onClick={() => { setSelectedGroup(club); setPage("group"); }}
                style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{club.name}</h3>
                    <p style={{ fontSize: 12, color: C.textDim }}>{club.members.length} membros · {club.movieCount} filmes</p>
                  </div>
                  <div style={{ display: "flex" }}>
                    {club.members.slice(0, 3).map((m, i) => {
                      const ini = (m.profile?.display_name || "?").slice(0, 2).toUpperCase();
                      return (
                        <div key={m.user_id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.bgDeep, background: m.profile?.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.bgCard}`, overflow: "hidden" }}>
                          {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {club.movieIds.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {club.movieIds.map((id) => (
                      <div key={id} style={{ width: 46, height: 68, borderRadius: 5, background: C.bgDeep, border: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
                        <MiniPoster tmdbId={id} />
                      </div>
                    ))}
                  </div>
                )}
                {club.description && <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>{club.description}</p>}
                <span style={{ fontSize: 12, color: C.gold }}>Ver club →</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ marginBottom: 12 }}><Film size={40} style={{ color: "#4A5E72" }} /></div>
            <p style={{ color: C.textMuted, fontSize: 15, fontWeight: 500 }}>Nenhum club ainda</p>
            <p style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>Crie um club e convide seus amigos!</p>
          </div>
        )}
      </div>
    </div>
  );
}
