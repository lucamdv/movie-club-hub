// @ts-nocheck
// ─────────────────────────────────────────────────────────────
//  ADDITIONS & REPLACEMENTS for ui.tsx
//  These are the components that need to change for PWA/mobile.
//  Copy-paste each section into your ui.tsx replacing the old one.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import {
  C,
  mascotWizard, mascotsNav, logoText,
  monkeyFlash, mascotSee, monkeyPopcorn,
  monkeyCrew, monkeySearch,
} from "./foundation";
import { Zap, Users, Search, Home } from "lucide-react";

// ═══════════════════════════════════════════════════════════
//  NEW: InstallBanner
//  Shows on LoginPage and after login until dismissed.
//  On Android: shows native A2HS prompt button.
//  On iOS Safari: shows manual instructions.
// ═══════════════════════════════════════════════════════════
export function InstallBanner({ isIOS, onInstall, onDismiss }) {
  return (
    <div className="pwa-install-banner" style={{ position: "relative" }}>
      <button className="banner-btn-dismiss" onClick={onDismiss}>✕</button>

      <img
        src="/apple-touch-icon.png"
        alt="MovieClub"
        className="banner-icon"
      />

      <div className="banner-text">
        <p className="banner-title">Adicionar MovieClub</p>
        {isIOS ? (
          <p className="banner-sub">
            Toque em <strong style={{ color: "#C9A84C" }}>Compartilhar</strong> e depois{" "}
            <strong style={{ color: "#C9A84C" }}>"Adicionar à Tela Inicial"</strong>
          </p>
        ) : (
          <p className="banner-sub">
            Instale o app para acesso rápido
          </p>
        )}
      </div>

      {!isIOS && (
        <button className="banner-btn-install" onClick={onInstall}>
          Instalar
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  REPLACEMENT: Navbar
//  — Desktop: horizontal top bar (unchanged)
//  — Mobile: top bar with logo/title only + separate BottomNav
// ═══════════════════════════════════════════════════════════
export function Navbar({ page, setPage, hasKeys, apiStatus, isMobile }) {
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
                    border: active ? `2px solid ${C.gold}` : "2px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.06)",
                    transition: "all 0.25s",
                    flexShrink: 0,
                    boxShadow: active ? "0 0 10px rgba(201,168,76,0.3)" : "none",
                  }}
                >
                  <img src={icon} alt="" style={{ width: 26, height: 26, objectFit: "cover", borderRadius: "50%" }} />
                </div>
                {label}
              </button>
            );
          })}
        </div>

        {/* Mobile: current page title */}
        {isMobile && (
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.textMuted,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {items.find(i => i.id === page)?.label || ""}
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

// ═══════════════════════════════════════════════════════════
//  REPLACEMENT: SplashScreen
//  Same as before but uses 100dvh for proper mobile support
// ═══════════════════════════════════════════════════════════
export function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("in");

  // Import logoMain dynamically to keep this file standalone
  const [logoSrc, setLogoSrc] = useState("");
  useEffect(() => {
    import("./foundation").then(({ logoMain }) => setLogoSrc(logoMain));
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), 2200);
    const t2 = setTimeout(() => onFinish(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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
        animation: phase === "out" ? "splashFadeOut 0.5s ease forwards" : undefined,
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
