"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LEAGUE_FILTERS = [
  { label: "All Football", query: "football highlights 2026" },
  { label: "Premier League", query: "Premier League highlights 2026" },
  { label: "Champions League", query: "UEFA Champions League highlights 2026" },
  { label: "La Liga", query: "La Liga highlights 2026" },
  { label: "Serie A", query: "Serie A highlights 2026" },
  { label: "Bundesliga", query: "Bundesliga highlights 2026" },
  { label: "Africa Cup", query: "AFCON Africa Cup of Nations highlights 2026" },
  { label: "World Cup", query: "FIFA World Cup 2026 highlights" },
]

interface YTVideo {
  id: string
  title: string
  thumbnail: string
  channel: string
  publishedAt: string
}

export default function WatchPage() {
  // ── Live Streams ──────────────────────────────────────────────────────────
  const [streams, setStreams] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [activeLink, setActiveLink] = useState<any>(null);
  const [streamsLoading, setStreamsLoading] = useState(true);

  // ── YouTube Highlights ────────────────────────────────────────────────────
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const [activeLeague, setActiveLeague] = useState(LEAGUE_FILTERS[0]);
  const [activeVideo, setActiveVideo] = useState<YTVideo | null>(null);

  useEffect(() => { fetchStreams(); }, []);
  useEffect(() => { fetchHighlights(activeLeague.query); }, [activeLeague]);

  async function fetchStreams() {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .order("is_live", { ascending: false })
      .order("match_time", { ascending: true });
    setStreams(data || []);
    setStreamsLoading(false);
  }

  async function fetchHighlights(query: string) {
    setYtLoading(true);
    setYtError("");
    setActiveVideo(null);
    try {
      const res = await fetch(
        `/api/youtube/highlights?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Failed to fetch highlights");
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (e: any) {
      setYtError(e.message || "Could not load highlights");
    } finally {
      setYtLoading(false);
    }
  }

  function selectMatch(stream: any) {
    setSelected(stream);
    setActiveLink(stream.stream_links?.[0] || null);
  }

  const card = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
  }

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "white", padding: "1.5rem 2rem" }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: "var(--font-orbitron)", fontSize: "1.8rem", fontWeight: 700, color: "#00c8ff", letterSpacing: "0.1em" }}>
          📺 WATCH LIVE
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.4rem" }}>Live matches & latest football highlights</p>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — LIVE STREAMS
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#ef4444", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🔴 LIVE &amp; UPCOMING MATCHES
        </h2>

        <div className={`watch-grid${selected ? " has-selected" : ""}`} style={{ display: "grid", gap: "1.5rem" }}>

          {/* Match List */}
          <div>
            {streamsLoading && <p style={{ color: "#64748b" }}>Loading matches...</p>}
            {!streamsLoading && streams.length === 0 && (
              <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#64748b" }}>
                <p style={{ fontSize: "2rem" }}>📭</p>
                <p>No matches available right now.</p>
                <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>Check back soon!</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {streams.map((stream) => (
                <div key={stream.id} onClick={() => selectMatch(stream)} style={{
                  ...card,
                  background: selected?.id === stream.id ? "rgba(0,200,255,0.1)" : "rgba(255,255,255,0.04)",
                  border: selected?.id === stream.id ? "1px solid rgba(0,200,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  padding: "1rem 1.25rem", cursor: "pointer", transition: "all 0.2s",
                }}>
                  {stream.is_live && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <span style={{ background: "#ef4444", color: "white", fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px" }}>
                        🔴 LIVE
                      </span>
                    </div>
                  )}
                  <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
                    {stream.home_team} <span style={{ color: "#64748b" }}>vs</span> {stream.away_team}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ background: "rgba(0,200,255,0.1)", color: "#00c8ff", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                      {stream.league}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                      {new Date(stream.match_time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ color: "#475569", fontSize: "0.7rem", marginTop: "0.5rem" }}>
                    {stream.stream_links?.length || 0} stream(s) available
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Player Panel */}
          {selected && (
            <div>
              <div style={{ ...card, border: "1px solid rgba(0,200,255,0.2)", padding: "1rem 1.5rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{selected.home_team} vs {selected.away_team}</p>
                  <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    {selected.league} · {new Date(selected.match_time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => { setSelected(null); setActiveLink(null); }} style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>

              {selected.stream_links?.length > 1 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  {selected.stream_links.map((link: any, i: number) => (
                    <button key={i} onClick={() => setActiveLink(link)} style={{
                      background: activeLink?.label === link.label ? "#00c8ff" : "rgba(255,255,255,0.08)",
                      color: activeLink?.label === link.label ? "#000" : "#fff",
                      border: "none", borderRadius: "8px", padding: "0.4rem 1rem",
                      cursor: "pointer", fontWeight: 600, fontSize: "0.8rem",
                    }}>
                      {link.label} · {link.quality}
                    </button>
                  ))}
                </div>
              )}

              {activeLink?.embed_url ? (
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,200,255,0.2)" }}>
                  <iframe src={activeLink.embed_url} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allowFullScreen allow="autoplay; encrypted-media; fullscreen" title={`${selected.home_team} vs ${selected.away_team}`} />
                </div>
              ) : (
                <div style={{ ...card, padding: "4rem", textAlign: "center", color: "#64748b" }}>
                  <p style={{ fontSize: "3rem" }}>📡</p>
                  <p>Stream not available yet</p>
                  <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>Check back closer to kick-off</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — YOUTUBE HIGHLIGHTS
      ══════════════════════════════════════════════════════════ */}
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#00c8ff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🎬 LATEST HIGHLIGHTS
        </h2>

        {/* League Filter Pills */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {LEAGUE_FILTERS.map((f) => (
            <button key={f.label} onClick={() => setActiveLeague(f)} style={{
              background: activeLeague.label === f.label ? "#00c8ff" : "rgba(255,255,255,0.06)",
              color: activeLeague.label === f.label ? "#000" : "#94a3b8",
              border: activeLeague.label === f.label ? "none" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: "999px", padding: "0.35rem 1rem",
              cursor: "pointer", fontWeight: 600, fontSize: "0.78rem", transition: "all 0.2s",
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Active Video Player */}
        {activeVideo && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(0,200,255,0.3)" }}>
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1`}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allowFullScreen allow="autoplay; encrypted-media; fullscreen"
                title={activeVideo.title}
              />
            </div>
            <div style={{ padding: "0.75rem 0" }}>
              <p style={{ fontWeight: 700, fontSize: "1rem" }}>{activeVideo.title}</p>
              <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                {activeVideo.channel} · {new Date(activeVideo.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <button onClick={() => setActiveVideo(null)} style={{ color: "#64748b", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "0.3rem 0.8rem", cursor: "pointer", fontSize: "0.78rem" }}>
              ✕ Close player
            </button>
          </div>
        )}

        {/* Loading */}
        {ytLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ ...card, padding: 0, overflow: "hidden" }}>
                <div style={{ background: "rgba(255,255,255,0.06)", aspectRatio: "16/9", animation: "pulse 1.5s infinite" }} />
                <div style={{ padding: "0.75rem" }}>
                  <div style={{ background: "rgba(255,255,255,0.06)", height: "12px", borderRadius: "4px", marginBottom: "0.5rem", animation: "pulse 1.5s infinite" }} />
                  <div style={{ background: "rgba(255,255,255,0.04)", height: "10px", borderRadius: "4px", width: "60%", animation: "pulse 1.5s infinite" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {ytError && !ytLoading && (
          <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#ef4444" }}>
            <p>⚠️ {ytError}</p>
            <button onClick={() => fetchHighlights(activeLeague.query)} style={{ marginTop: "1rem", color: "#00c8ff", background: "none", border: "1px solid #00c8ff", borderRadius: "8px", padding: "0.4rem 1rem", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* Video Grid */}
        {!ytLoading && !ytError && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {videos.map((video) => (
              <div key={video.id} onClick={() => setActiveVideo(video)} style={{
                ...card,
                padding: 0, overflow: "hidden", cursor: "pointer", transition: "all 0.2s",
                border: activeVideo?.id === video.id ? "1px solid rgba(0,200,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
              }}
                onMouseEnter={e => (e.currentTarget.style.border = "1px solid rgba(0,200,255,0.4)")}
                onMouseLeave={e => (e.currentTarget.style.border = activeVideo?.id === video.id ? "1px solid rgba(0,200,255,0.5)" : "1px solid rgba(255,255,255,0.08)")}
              >
                {/* Thumbnail */}
                <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
                  <img src={video.thumbnail} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", opacity: 0, transition: "opacity 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "1.2rem" }}>▶</span>
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding: "0.75rem" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {video.title}
                  </p>
                  <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.4rem" }}>
                    {video.channel}
                  </p>
                  <p style={{ color: "#475569", fontSize: "0.7rem", marginTop: "0.2rem" }}>
                    {new Date(video.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!ytLoading && !ytError && videos.length === 0 && (
          <div style={{ ...card, padding: "2rem", textAlign: "center", color: "#64748b" }}>
            <p>No highlights found for {activeLeague.label}</p>
          </div>
        )}
      </div>
    </div>
  );
}
