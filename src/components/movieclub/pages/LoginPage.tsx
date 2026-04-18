// @ts-nocheck
// ─────────────────────────────────────────────────────────────
//  LoginPage — mobile-aware version
//  Replace the existing LoginPage.tsx with this file.
//  Key changes:
//    • On mobile: left panel is hidden (CSS .login-left-panel)
//    • Logo shown at top of form column via .login-logo-mobile
//    • Form panel gets .login-right-panel class
//    • Input font-size 16px (prevents iOS zoom)
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { toast } from "sonner";
import { C, logoMain, mascotsNav, logoText } from "../foundation";
import { TextInput, FilmStripBg } from "../ui";

export function LoginPage({ onLogin, onSignup, error }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !pass) { toast.error("Preencha email e senha"); return; }
    if (mode === "signup" && pass.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return; }
    if (mode === "signup" && !name) { toast.error("Preencha seu nome"); return; }
    setLoading(true);
    try {
      if (mode === "login") await onLogin(email, pass);
      else await onSignup(email, pass, name, username);
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", position: "relative", overflow: "hidden" }}>

      {/* ── Left branding (desktop only) ── */}
      <div
        className="login-left-panel"
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
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: `1px solid rgba(201,168,76,0.08)`, top: "-15%", left: "-10%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", border: `1px solid rgba(201,168,76,0.05)`, bottom: "-10%", right: "-5%", pointerEvents: "none" }} />

        <div style={{ animation: "staggerUp 0.8s ease 0.1s both", textAlign: "center", position: "relative", zIndex: 1 }}>
          <img src={logoMain} alt="MovieClub Logo" style={{ width: 280, marginBottom: 24, filter: "drop-shadow(0 8px 32px rgba(201,168,76,0.25))" }} />
        </div>
        <div style={{ animation: "staggerUp 0.8s ease 0.3s both", textAlign: "center", position: "relative", zIndex: 1 }}>
          <img src={logoText} alt="MOVIECLUB" style={{ width: 320, marginBottom: 16, filter: "drop-shadow(0 4px 16px rgba(201,168,76,0.2))" }} />
          <p style={{ color: C.goldLight, fontSize: 13, letterSpacing: "0.35em", fontWeight: 300, opacity: 0.7, fontFamily: "'DM Sans', sans-serif" }}>SHARED FILM PLATFORM</p>
        </div>
        <div style={{ animation: "staggerUp 0.8s ease 0.5s both", marginTop: 40, position: "relative", zIndex: 1 }}>
          <img src={mascotsNav} alt="MovieClub Mascots" loading="lazy" style={{ width: 320, opacity: 0.85, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))" }} />
        </div>
        <p style={{ animation: "staggerUp 0.8s ease 0.7s both", color: C.textMuted, fontSize: 14, marginTop: 32, maxWidth: 300, textAlign: "center", lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", position: "relative", zIndex: 1 }}>
          Descubra, avalie e compartilhe filmes com seus amigos.
        </p>
      </div>

      {/* ── Right / full-width form panel ── */}
      <div
        className="login-right-panel"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(180deg, ${C.bgCard} 0%, ${C.bgDeep} 100%)`,
          borderLeft: `1px solid ${C.border}`,
          position: "relative",
          padding: "0 24px",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 30%, rgba(201,168,76,0.04) 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

          {/* Mobile-only logo at top of form */}
          <div className="login-logo-mobile">
            <img src={logoMain} alt="MovieClub" style={{ width: 100, marginBottom: 12, filter: "drop-shadow(0 0 20px rgba(201,168,76,0.3))" }} />
            <img src={logoText} alt="MOVIECLUB" style={{ width: 160, opacity: 0.9 }} />
          </div>

          <div style={{ marginBottom: 28, animation: "staggerUp 0.6s ease 0.2s both" }}>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, color: C.text, fontWeight: 700, marginBottom: 6 }}>
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h2>
            <p style={{ color: C.textMuted, fontSize: 14 }}>
              {mode === "login" ? "Entre para continuar sua jornada cinematográfica" : "Junte-se ao clube e descubra novos filmes"}
            </p>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", marginBottom: 24, background: "rgba(9,21,35,0.6)", borderRadius: 12, padding: 3, animation: "staggerUp 0.6s ease 0.3s both" }}>
            {["login", "signup"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  background: mode === m ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : "transparent",
                  color: mode === m ? C.bgDeep : C.textMuted,
                  border: "none",
                  transition: "all 0.25s",
                  minHeight: "unset",
                  minWidth: "unset",
                }}
              >
                {m === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "staggerUp 0.5s ease 0.4s both" }}>
            {mode === "signup" && (
              <>
                <TextInput label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
                <TextInput label="Username" value={username} onChange={setUsername} placeholder="@username" />
              </>
            )}
            <TextInput label="Email" value={email} onChange={setEmail} placeholder="voce@email.com" type="email" />
            <TextInput label="Senha" value={pass} onChange={setPass} placeholder="••••••••" type="password" />
          </div>

          {mode === "login" && (
            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button style={{ color: C.gold, fontSize: 13, fontWeight: 500, opacity: 0.8, minHeight: "unset", minWidth: "unset" }}>
                Esqueceu a senha?
              </button>
            </div>
          )}

          {error && (
            <p style={{ color: C.red, fontSize: 13, textAlign: "center", marginTop: 14, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>
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
              marginTop: 22,
              padding: "16px",
              color: C.bgDeep,
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.04em",
              transition: "transform 0.15s, box-shadow 0.2s",
              boxShadow: "0 4px 20px rgba(201,168,76,0.25)",
              opacity: loading ? 0.6 : 1,
              minHeight: "unset",
            }}
          >
            {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar Conta"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ color: C.textDim, fontSize: 12, whiteSpace: "nowrap" }}>ou continue com</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {["Google", "Apple"].map((p) => (
              <button
                key={p}
                onClick={onLogin}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "rgba(9,21,35,0.5)",
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  transition: "all 0.2s",
                  minHeight: "unset",
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
