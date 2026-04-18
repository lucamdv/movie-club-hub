// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { C } from "../foundation";
import { Search, Users, UserRound, Handshake } from "lucide-react";
import { Spinner, Badge, Btn, SearchSVG, LinkIcon, UserPlusIcon, UserCheckIcon } from "../ui";
import { useFollows, useFriendships } from "../hooks";
import { Link2 } from "lucide-react";

export function FriendsPage({ setPage, setSelectedMovie, auth: authCtx, onViewProfile }) {
  const userId = authCtx?.user?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tab, setTab] = useState("search");
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [followerProfiles, setFollowerProfiles] = useState([]);
  const [friendProfiles, setFriendProfiles] = useState([]);
  const debRef = useRef(null);

  const { following, followers, follow, unfollow, isFollowing, loading: followsLoading } = useFollows(userId);
  const { friends, isFriend } = useFriendships(userId);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    debRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const q = searchQuery.trim().toLowerCase();
      const { data } = await supabase.from("profiles").select("*").or(`display_name.ilike.%${q}%,username.ilike.%${q}%`).neq("user_id", userId).limit(20);
      setSearchResults(data || []);
      setSearchLoading(false);
    }, 400);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [searchQuery, userId]);

  useEffect(() => {
    if (!following.length) { setFollowingProfiles([]); return; }
    const ids = following.map((f) => f.following_id);
    supabase.from("profiles").select("*").in("user_id", ids).then(({ data }) => setFollowingProfiles(data || []));
  }, [following]);

  useEffect(() => {
    if (!followers.length) { setFollowerProfiles([]); return; }
    const ids = followers.map((f) => f.follower_id);
    supabase.from("profiles").select("*").in("user_id", ids).then(({ data }) => setFollowerProfiles(data || []));
  }, [followers]);

  useEffect(() => {
    if (!friends.length) { setFriendProfiles([]); return; }
    const ids = friends.map((f) => f.user_a_id === userId ? f.user_b_id : f.user_a_id);
    supabase.from("profiles").select("*").in("user_id", ids).then(({ data }) => setFriendProfiles(data || []));
  }, [friends, userId]);

  const handleShareProfile = () => {
    const url = `${window.location.origin}?profile=${userId}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link do perfil copiado!")).catch(() => toast.error("Erro ao copiar"));
  };

  const UserCard = ({ profile, showActions = true }) => {
    const avatarUrl = profile?.avatar_url || null;
    const initials = (profile?.display_name || "?").slice(0, 2).toUpperCase();
    const isFollowingUser = isFollowing(profile.user_id);
    const isFriendUser = isFriend(profile.user_id);

    return (
      <div
        style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s", cursor: "pointer" }}
        className="card-hover"
        onClick={() => onViewProfile?.(profile.user_id)}
      >
        <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: avatarUrl ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.bgDeep, fontFamily: "'Outfit', sans-serif" }}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 2 }}>{profile.display_name || "Sem nome"}</p>
          {profile.username && <p style={{ fontSize: 12, color: C.gold }}>@{profile.username}</p>}
          {profile.bio && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.bio}</p>}
        </div>
        {showActions && profile.user_id !== userId && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {isFriendUser && <Badge color="rgba(34,197,94,0.15)" textColor={C.success}>Amigo</Badge>}
            <Btn
              variant={isFollowingUser ? "ghost" : "gold"}
              size="sm"
              onClick={(e) => { e.stopPropagation(); if (isFollowingUser) unfollow(profile.user_id); else follow(profile.user_id); }}
            >
              {isFollowingUser ? <><UserCheckIcon /> Seguindo</> : <><UserPlusIcon /> Seguir</>}
            </Btn>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 28px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            <span style={{ color: C.gold }}>Amigos</span> & Social
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13 }}>Encontre pessoas, siga e adicione amigos</p>
        </div>

        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <LinkIcon />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Compartilhar Perfil</h3>
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Envie o link do seu perfil para que amigos possam te encontrar e seguir.</p>
          <Btn variant="gold" size="sm" onClick={handleShareProfile}>
            <Link2 size={13} /> Copiar Link do Perfil
          </Btn>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bgCard, borderRadius: 12, padding: 3, border: `1px solid ${C.border}` }}>
          {[["search", "Buscar"], ["following", `Seguindo (${following.length})`], ["followers", `Seguidores (${followers.length})`], ["friends", `Amigos (${friends.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, color: tab === id ? C.bgDeep : C.textMuted, background: tab === id ? C.gold : "transparent", transition: "all 0.2s", whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <div>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><SearchSVG size={15} /></div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou username..."
                style={{ width: "100%", padding: "14px 14px 14px 40px", borderRadius: 12, background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
                onFocus={(e) => (e.target.style.borderColor = C.gold)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>
            {searchLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner size={28} /></div>
            ) : searchResults.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{searchResults.map((p) => <UserCard key={p.id} profile={p} />)}</div>
            ) : searchQuery ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
                <div style={{ marginBottom: 12 }}><Search size={32} style={{ color: "#4A5E72" }} /></div>
                <p style={{ fontSize: 14 }}>Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
                <div style={{ marginBottom: 12 }}><Users size={40} style={{ color: "#4A5E72" }} /></div>
                <p style={{ fontSize: 14, marginBottom: 4 }}>Busque por nome ou username</p>
                <p style={{ fontSize: 12 }}>para encontrar e seguir outros cinéfilos</p>
              </div>
            )}
          </div>
        )}

        {tab === "following" && (
          <div>
            {followsLoading ? <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner size={28} /></div>
              : followingProfiles.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{followingProfiles.map((p) => <UserCard key={p.id} profile={p} />)}</div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
                  <div style={{ marginBottom: 12 }}><UserRound size={40} style={{ color: "#4A5E72" }} /></div>
                  <p style={{ fontSize: 14 }}>Você ainda não segue ninguém</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Busque usuários e comece a seguir!</p>
                </div>
              )}
          </div>
        )}

        {tab === "followers" && (
          <div>
            {followsLoading ? <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner size={28} /></div>
              : followerProfiles.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{followerProfiles.map((p) => <UserCard key={p.id} profile={p} />)}</div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
                  <div style={{ marginBottom: 12 }}><UserRound size={40} style={{ color: "#4A5E72" }} /></div>
                  <p style={{ fontSize: 14 }}>Nenhum seguidor ainda</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Compartilhe seu perfil para ganhar seguidores!</p>
                </div>
              )}
          </div>
        )}

        {tab === "friends" && (
          <div>
            {friendProfiles.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{friendProfiles.map((p) => <UserCard key={p.id} profile={p} />)}</div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.textDim }}>
                <div style={{ marginBottom: 12 }}><Handshake size={40} style={{ color: "#4A5E72" }} /></div>
                <p style={{ fontSize: 14 }}>Nenhum amigo ainda</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Gere um link de amizade e envie para seus amigos!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
