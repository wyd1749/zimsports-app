"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

export default function FantasyPage() {
  const [user, setUser] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "bets">("dashboard");

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAccount(session.user.id);
      else { setAccount(null); setBets([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) await fetchAccount(session.user.id);
    setLoading(false);
  }

  async function fetchAccount(userId: string) {
    const { data } = await supabase
      .from("fantasy_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();
    setAccount(data);
    await fetchBets(userId);
  }

  async function fetchBets(userId: string) {
    const { data } = await supabase
      .from("fantasy_bets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBets(data || []);
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/fantasy` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setAccount(null);
    setBets([]);
  }

  const totalBets = bets.length;
  const wonBets = bets.filter(b => b.status === "won").length;
  const lostBets = bets.filter(b => b.status === "lost").length;
  const pendingBets = bets.filter(b => b.status === "pending").length;
  const totalWon = bets.filter(b => b.status === "won").reduce((sum, b) => sum + Number(b.potential_win), 0);
  const totalStaked = bets.reduce((sum, b) => sum + Number(b.stake), 0);
  const profitLoss = totalWon - totalStaked;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#64748b" }}>Loading...</p>
    </div>
  );

  // Not logged in
  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: "400px", padding: "2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎮</div>
        <h1 style={{ fontFamily: "var(--font-orbitron)", fontSize: "1.8rem", color: "#00c8ff", marginBottom: "0.5rem" }}>
          FANTASY BETTING
        </h1>
        <p style={{ color: "#64748b", marginBottom: "0.5rem" }}>
          Start with <span style={{ color: "#22c55e", fontWeight: 700 }}>$20 virtual cash</span>
        </p>
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "2rem" }}>
          Bet on real matches using odds from BetVision. No real money involved — just glory!
        </p>
        <button onClick={signInWithGoogle} style={{
          background: "white", color: "#1a1a1a", border: "none",
          borderRadius: "12px", padding: "0.9rem 2rem",
          fontWeight: 700, fontSize: "1rem", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.75rem", margin: "0 auto",
        }}>
          <img src="https://www.google.com/favicon.ico" width={20} height={20} alt="Google" />
          Sign in with Google
        </button>
        <p style={{ color: "#334155", fontSize: "0.75rem", marginTop: "1.5rem" }}>
          Free to play · No real money · Just fun
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "white", padding: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-orbitron)", fontSize: "1.8rem", color: "#00c8ff" }}>
            🎮 FANTASY BETTING
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Welcome back, {account?.display_name || user.email}!
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {account?.avatar_url && (
            <img src={account.avatar_url} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #00c8ff" }} />
          )}
          <button onClick={signOut} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", borderRadius: "8px", padding: "0.4rem 1rem",
            cursor: "pointer", fontSize: "0.85rem"
          }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div style={{
        background: "linear-gradient(135deg, rgba(0,200,255,0.1), rgba(0,100,200,0.1))",
        border: "1px solid rgba(0,200,255,0.3)",
        borderRadius: "16px", padding: "1.5rem 2rem",
        marginBottom: "1.5rem",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "1.5rem"
      }}>
        <div>
          <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>VIRTUAL BALANCE</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, color: "#00c8ff" }}>
            ${Number(account?.balance || 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>PROFIT / LOSS</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, color: profitLoss >= 0 ? "#22c55e" : "#ef4444" }}>
            {profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(2)}
          </p>
        </div>
        <div>
          <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>BETS WON</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, color: "#22c55e" }}>{wonBets}</p>
        </div>
        <div>
          <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>BETS LOST</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>{lostBets}</p>
        </div>
        <div>
          <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "0.25rem" }}>PENDING</p>
          <p style={{ fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>{pendingBets}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {(["dashboard", "bets"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? "#00c8ff" : "rgba(255,255,255,0.05)",
            color: activeTab === tab ? "#000" : "#94a3b8",
            border: "none", borderRadius: "8px", padding: "0.5rem 1.25rem",
            fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", textTransform: "capitalize"
          }}>
            {tab === "dashboard" ? "📊 Dashboard" : "🎯 My Bets"}
          </button>
        ))}
        <a href="/results" style={{
          background: "rgba(0,200,255,0.1)", color: "#00c8ff",
          border: "1px solid rgba(0,200,255,0.3)", borderRadius: "8px",
          padding: "0.5rem 1.25rem", fontWeight: 600, fontSize: "0.85rem",
          textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          💰 Place Bets on BetVision
        </a>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div>
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px", padding: "1.5rem", marginBottom: "1rem"
          }}>
            <h3 style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>BETTING STATS</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>{totalBets}</p>
                <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Total Bets</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>
                  {totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0}%
                </p>
                <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Win Rate</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>${totalStaked.toFixed(2)}</p>
                <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Total Staked</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#22c55e" }}>${totalWon.toFixed(2)}</p>
                <p style={{ color: "#64748b", fontSize: "0.75rem" }}>Total Won</p>
              </div>
            </div>
          </div>

          {bets.length === 0 && (
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#64748b"
            }}>
              <p style={{ fontSize: "2rem" }}>🎯</p>
              <p style={{ marginTop: "0.5rem" }}>No bets yet! Head to BetVision to place your first bet.</p>
              <a href="/results" style={{
                display: "inline-block", marginTop: "1rem",
                background: "#00c8ff", color: "#000", borderRadius: "8px",
                padding: "0.5rem 1.5rem", fontWeight: 700, textDecoration: "none"
              }}>Go to BetVision →</a>
            </div>
          )}
        </div>
      )}

      {/* Bets Tab */}
      {activeTab === "bets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {bets.length === 0 && (
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#64748b"
            }}>
              <p>No bets placed yet.</p>
            </div>
          )}
          {bets.map(bet => (
            <div key={bet.id} style={{
              background: "rgba(255,255,255,0.03)", border: `1px solid ${
                bet.status === "won" ? "rgba(34,197,94,0.3)" :
                bet.status === "lost" ? "rgba(239,68,68,0.3)" :
                "rgba(255,255,255,0.08)"
              }`,
              borderRadius: "12px", padding: "1rem 1.25rem",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem"
            }}>
              <div>
                <p style={{ fontWeight: 700 }}>{bet.home_team} vs {bet.away_team}</p>
                <p style={{ color: "#64748b", fontSize: "0.8rem" }}>{bet.league} · {bet.bet_type}</p>
                <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  {new Date(bet.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{
                  background: bet.status === "won" ? "rgba(34,197,94,0.15)" :
                    bet.status === "lost" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                  color: bet.status === "won" ? "#22c55e" : bet.status === "lost" ? "#ef4444" : "#f59e0b",
                  padding: "2px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700
                }}>
                  {bet.status.toUpperCase()}
                </span>
                <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                  Stake: <strong>${Number(bet.stake).toFixed(2)}</strong> @ <strong>{bet.odds}x</strong>
                </p>
                <p style={{ color: "#22c55e", fontSize: "0.85rem" }}>
                  To win: <strong>${Number(bet.potential_win).toFixed(2)}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}