"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "tinashejmbanje13@gmail.com";

export default function LiveStreamsAdmin() {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signing, setSigning] = useState(false);
  const [authError, setAuthError] = useState("");

  const [form, setForm] = useState({
    home_team: "",
    away_team: "",
    league: "",
    match_time: "",
    is_live: false,
    stream_links: [{ label: "Stream 1", embed_url: "", quality: "HD" }],
  });

  // ── Check session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        fetchStreams();
      }
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        fetchStreams();
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Email/Password login ───────────────────────────────────────────────────
  async function handleLogin() {
    if (!email.trim() || !password.trim()) return setAuthError("Enter your email and password.");
    if (email.trim().toLowerCase() !== ADMIN_EMAIL) return setAuthError("Access denied.");
    setAuthError("");
    setSigning(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSigning(false);
    if (error) return setAuthError(error.message)
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setEmail("");
    setPassword("");
  }

  // ── Stream CRUD ────────────────────────────────────────────────────────────
  async function fetchStreams() {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .order("match_time", { ascending: false });
    setStreams(data || []);
  }

  function updateStreamLink(index: number, field: string, value: string) {
    const updated = [...form.stream_links];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, stream_links: updated });
  }

  function addStreamLink() {
    setForm({
      ...form,
      stream_links: [
        ...form.stream_links,
        { label: `Stream ${form.stream_links.length + 1}`, embed_url: "", quality: "HD" },
      ],
    });
  }

  async function handleSubmit() {
    setLoading(true);
    const { error } = await supabase.from("live_streams").insert([form]);
    if (error) alert("Error: " + error.message);
    else {
      alert("Stream added!");
      fetchStreams();
      setForm({
        home_team: "",
        away_team: "",
        league: "",
        match_time: "",
        is_live: false,
        stream_links: [{ label: "Stream 1", embed_url: "", quality: "HD" }],
      });
    }
    setLoading(false);
  }

  async function toggleLive(id: string, current: boolean) {
    await supabase.from("live_streams").update({ is_live: !current }).eq("id", id);
    fetchStreams();
  }

  async function deleteStream(id: string) {
    if (!confirm("Delete this stream?")) return;
    await supabase.from("live_streams").delete().eq("id", id);
    fetchStreams();
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse text-lg font-bold">Checking access...</div>
      </div>
    );
  }

  // ── Login Gate ─────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-cyan-500/20 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-cyan-400">Admin Login</h1>
            <p className="text-sm text-gray-400 mt-1">ZimSports AI — Live Streams Admin</p>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => { setEmail(e.target.value); setAuthError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500"
            />
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            <button
              onClick={handleLogin}
              disabled={signing}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-colors"
            >
              {signing ? "Signing in..." : "Sign In"}
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">Restricted access · Admins only</p>
        </div>
      </div>
    );
  }

  // ── Admin Panel ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-cyan-400">🔴 Live Streams Admin</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-400/50 rounded-lg px-4 py-2 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Add Match Form */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-cyan-500/20">
        <h2 className="text-xl font-semibold mb-4 text-cyan-300">Add Match</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input className="bg-gray-800 rounded-lg p-3 text-white" placeholder="Home Team"
            value={form.home_team} onChange={e => setForm({ ...form, home_team: e.target.value })} />
          <input className="bg-gray-800 rounded-lg p-3 text-white" placeholder="Away Team"
            value={form.away_team} onChange={e => setForm({ ...form, away_team: e.target.value })} />
          <input className="bg-gray-800 rounded-lg p-3 text-white" placeholder="League (e.g. EPL)"
            value={form.league} onChange={e => setForm({ ...form, league: e.target.value })} />
          <input className="bg-gray-800 rounded-lg p-3 text-white" type="datetime-local"
            value={form.match_time} onChange={e => setForm({ ...form, match_time: e.target.value })} />
        </div>

        <div className="mb-4">
          <h3 className="text-sm text-gray-400 mb-2">Stream Embed URLs</h3>
          {form.stream_links.map((link, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input className="bg-gray-800 rounded-lg p-2 text-white text-sm" placeholder="Label"
                value={link.label} onChange={e => updateStreamLink(i, "label", e.target.value)} />
              <input className="bg-gray-800 rounded-lg p-2 text-white text-sm" placeholder="Embed URL"
                value={link.embed_url} onChange={e => updateStreamLink(i, "embed_url", e.target.value)} />
              <input className="bg-gray-800 rounded-lg p-2 text-white text-sm" placeholder="Quality"
                value={link.quality} onChange={e => updateStreamLink(i, "quality", e.target.value)} />
            </div>
          ))}
          <button onClick={addStreamLink} className="text-cyan-400 text-sm mt-1 hover:text-cyan-300">
            + Add another stream
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input type="checkbox" checked={form.is_live}
            onChange={e => setForm({ ...form, is_live: e.target.checked })} />
          <label className="text-sm text-gray-300">Mark as Live Now</label>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold py-3 px-6 rounded-lg">
          {loading ? "Saving..." : "Add Stream"}
        </button>
      </div>

      {/* Existing Streams */}
      <h2 className="text-xl font-semibold mb-4 text-cyan-300">All Matches</h2>
      <div className="space-y-3">
        {streams.map(s => (
          <div key={s.id} className="bg-gray-900 rounded-xl p-4 border border-gray-700 flex items-center justify-between">
            <div>
              <p className="font-bold">{s.home_team} vs {s.away_team}</p>
              <p className="text-sm text-gray-400">{s.league} · {new Date(s.match_time).toLocaleString()}</p>
              <p className="text-xs text-gray-500">{s.stream_links?.length} stream(s)</p>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => toggleLive(s.id, s.is_live)}
                className={`px-3 py-1 rounded-full text-sm font-bold ${s.is_live ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300"}`}>
                {s.is_live ? "🔴 LIVE" : "Offline"}
              </button>
              <button onClick={() => deleteStream(s.id)}
                className="text-red-400 hover:text-red-300 text-sm">Delete</button>
            </div>
          </div>
        ))}
        {streams.length === 0 && (
          <p className="text-gray-500 text-sm">No streams added yet.</p>
        )}
      </div>
    </div>
  );
}
