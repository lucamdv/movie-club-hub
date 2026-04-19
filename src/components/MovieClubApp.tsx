// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { C, tmdb } from "./movieclub/foundation";
import { useAuth } from "./movieclub/hooks";
import { Spinner, Navbar, SplashScreen, InstallBanner } from "./movieclub/ui";
import {
  HomePage, QuickRatePage, ProfilePage, MoviePage,
  FriendsPage, GroupsPage, GroupPage, SearchPage,
  SettingsPage, LoginPage,
} from "./movieclub/pages";

// ─── PWA Install Hook ─────────────────────────────────────
function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Detect if already installed as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) { setIsInstalled(true); return; }

    // Detect iOS
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!dismissedRef.current) {
        // Show banner after a short delay (not immediately on page load)
        setTimeout(() => setShowBanner(true), 2500);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: show manual instruction after delay if not dismissed
    if (ios && !dismissedRef.current) {
      setTimeout(() => setShowBanner(true), 2500);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const { outcome } = await (installPrompt as any).userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setInstallPrompt(null);
  }, [installPrompt]);

  const dismissBanner = useCallback(() => {
    dismissedRef.current = true;
    setShowBanner(false);
    // Don't show again for this session
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  }, []);

  // Respect previous dismissal in the same session
  useEffect(() => {
    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      dismissedRef.current = true;
    }
  }, []);

  return {
    canInstall: !!installPrompt || isIOS,
    isInstalled,
    isIOS,
    showBanner: showBanner && !isInstalled,
    triggerInstall,
    dismissBanner,
  };
}

// ─── isMobile Hook ────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

// ─── App ──────────────────────────────────────────────────
export default function MovieClubApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("home");
  const [selectedMovie, setSM] = useState(null);
  const [selectedGroup, setSG] = useState(null);
  const [viewProfileUserId, setViewProfileUserId] = useState(null);
  const [apiStatus, setApiStatus] = useState({ tmdb: false, omdb: false, streaming: false });
  const authCtx = useAuth();
  const [authError, setAuthError] = useState("");
  const isMobile = useIsMobile();
  const pwa = usePWAInstall();

  useEffect(() => {
    tmdb.popular().then((d) => {
      if (d?.results) setApiStatus((s) => ({ ...s, tmdb: true }));
    }).catch(() => {});
  }, []);

  // Auto-detect profile/club links in URL
  useEffect(() => {
    if (!authCtx.user) return;
    const params = new URLSearchParams(window.location.search);
    const profileId = params.get("profile");
    const clubCode = params.get("club");
    if (profileId) {
      window.history.replaceState({}, "", window.location.pathname);
      if (profileId === authCtx.user.id) setPage("profile");
      else { setViewProfileUserId(profileId); setPage("view-profile"); }
    }
    if (clubCode) {
      window.history.replaceState({}, "", window.location.pathname);
      setPage("groups");
      setTimeout(async () => {
        try {
          const { data: club } = await supabase.from("clubs").select("id").eq("invite_code", clubCode).single();
          if (!club) { toast.error("Código de club inválido"); return; }
          const { data: existing } = await supabase.from("club_members").select("id").eq("club_id", club.id).eq("user_id", authCtx.user.id).maybeSingle();
          if (existing) { toast.info("Você já é membro deste club!"); return; }
          await supabase.from("club_members").insert({ club_id: club.id, user_id: authCtx.user.id });
          toast.success("Você entrou no club! 🎉");
        } catch { toast.error("Erro ao entrar no club"); }
      }, 500);
    }
  }, [authCtx.user]);

  const handleViewProfile = (userId) => {
    if (userId === authCtx?.user?.id) setPage("profile");
    else { setViewProfileUserId(userId); setPage("view-profile"); }
  };

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  const handleLogin = async (email, password) => {
    try {
      setAuthError("");
      await authCtx.signIn(email, password);
      toast.success("Login realizado com sucesso!");
    } catch (e) {
      const msg = e.message || "Erro ao entrar";
      setAuthError(msg);
      toast.error(msg);
      throw e;
    }
  };

  const handleSignup = async (email, password, name, username) => {
    try {
      setAuthError("");
      await authCtx.signUp(email, password, name, username);
      toast.success("Conta criada com sucesso! Bem-vindo(a)!");
    } catch (e) {
      const msg = e.message || "Erro ao cadastrar";
      setAuthError(msg);
      toast.error(msg);
      throw e;
    }
  };

  if (showSplash) return <SplashScreen onFinish={handleSplashDone} />;
  if (authCtx.loading) return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner size={32} />
    </div>
  );
  if (!authCtx.user) return (
    <>
      <LoginPage onLogin={handleLogin} onSignup={handleSignup} error={authError} />
      {/* Show install banner even on login screen */}
      {pwa.showBanner && (
        <InstallBanner
          isIOS={pwa.isIOS}
          onInstall={pwa.triggerInstall}
          onDismiss={pwa.dismissBanner}
        />
      )}
    </>
  );

  return (
    <div style={{ minHeight: "100dvh", background: C.bg }}>
      <Navbar
        page={page}
        setPage={setPage}
        hasKeys={true}
        apiStatus={apiStatus}
        isMobile={isMobile}
      />

      {/* Main content — padding handled by .app-content class */}
      <div className="app-content page-enter" key={page}>
        {page === "home" && <HomePage setPage={setPage} setSelectedMovie={setSM} auth={authCtx} isMobile={isMobile} />}
        {page === "quickrate" && <QuickRatePage setPage={setPage} setSelectedMovie={setSM} auth={authCtx} />}
        {page === "profile" && <ProfilePage setPage={setPage} isOwnProfile auth={authCtx} setSelectedMovie={setSM} />}
        {page === "view-profile" && <ProfilePage setPage={setPage} auth={authCtx} setSelectedMovie={setSM} viewUserId={viewProfileUserId} />}
        {page === "movie" && <MoviePage movieInit={selectedMovie} setPage={setPage} setSelectedMovie={setSM} auth={authCtx} isMobile={isMobile} />}
        {page === "friends" && <FriendsPage setPage={setPage} setSelectedMovie={setSM} auth={authCtx} onViewProfile={handleViewProfile} />}
        {page === "groups" && <GroupsPage setPage={setPage} setSelectedGroup={setSG} auth={authCtx} />}
        {page === "group" && <GroupPage group={selectedGroup} setPage={setPage} setSelectedMovie={setSM} auth={authCtx} />}
        {page === "search" && <SearchPage setPage={setPage} setSelectedMovie={setSM} isMobile={isMobile} />}
        {page === "settings" && <SettingsPage apiStatus={apiStatus} />}
      </div>

      {/* PWA install banner — floats above bottom nav */}
      {pwa.showBanner && (
        <InstallBanner
          isIOS={pwa.isIOS}
          onInstall={pwa.triggerInstall}
          onDismiss={pwa.dismissBanner}
        />
      )}
    </div>
  );
}
