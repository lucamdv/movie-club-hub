// @ts-nocheck
import { useState } from "react";
import { C, tmdb, omdb } from "../foundation";
import { Spinner, Btn, CheckIcon } from "../ui";

export function SettingsPage({ apiStatus }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState({});

  const testApis = async () => {
    setTesting(true);
    setResults({});
    try {
      const tmdbRes = await tmdb.popular();
      setResults((r) => ({
        ...r,
        tmdb: {
          ok: !!tmdbRes?.results,
          msg: tmdbRes?.results
            ? `✓ TMDb respondeu com ${tmdbRes.results.length} filmes`
            : "✗ Falha na resposta",
        },
      }));
    } catch (e) {
      setResults((r) => ({
        ...r,
        tmdb: { ok: false, msg: `✗ Erro: ${e.message}` },
      }));
    }
    try {
      const omdbRes = await omdb.byTitle("Inception", 2010);
      setResults((r) => ({
        ...r,
        omdb: {
          ok: !!omdbRes?.Title,
          msg: omdbRes?.Title
            ? `✓ OMDb: "${omdbRes.Title}" (${omdbRes.Year})`
            : "✗ Sem resposta",
        },
      }));
    } catch (e) {
      setResults((r) => ({
        ...r,
        omdb: { ok: false, msg: `✗ Erro: ${e.message}` },
      }));
    }
    setTesting(false);
  };

  const APIS = [
    {
      key: "tmdb",
      label: "TMDb API",
      color: "#01B4E4",
      desc: "Pôsteres, metadados, elenco, trailers, busca e recomendações.",
      secret: "TMDB_API_KEY",
    },
    {
      key: "omdb",
      label: "OMDb API",
      color: "#F5C518",
      desc: "Ratings IMDb, Rotten Tomatoes, Metacritic, bilheteria e prêmios.",
      secret: "OMDB_API_KEY",
    },
  ];

  return (
    <div style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 28px" }}>
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}
        >
          Status das <span style={{ color: C.gold }}>APIs</span>
        </h1>
        <p
          style={{
            color: C.textMuted,
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          As chaves de API estão configuradas no{" "}
          <strong style={{ color: C.text }}>servidor</strong>.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {APIS.map((api) => {
            const result = results[api.key];
            return (
              <div
                key={api.key}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: api.color,
                      flexShrink: 0,
                    }}
                  />
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                    {api.label}
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    marginBottom: 10,
                    lineHeight: 1.6,
                    paddingLeft: 20,
                  }}
                >
                  {api.desc}
                </p>
                {result && (
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      color: result.ok ? C.success : C.red,
                      padding: "7px 12px",
                      borderRadius: 8,
                      background: result.ok
                        ? "rgba(34,197,94,0.07)"
                        : "rgba(239,68,68,0.07)",
                    }}
                  >
                    {result.msg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 28 }}>
          <Btn variant="gold" onClick={testApis}>
            {testing ? (
              <>
                <Spinner size={14} /> Testando…
              </>
            ) : (
              <>
                <CheckIcon /> Testar APIs
              </>
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
}
