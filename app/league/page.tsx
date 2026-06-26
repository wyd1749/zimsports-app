'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { createBrowserClient } from '@supabase/ssr'
import {
  Trophy, TrendingUp, TrendingDown, Minus, Crown,
  Users, Zap, Target, Shield, Star, ChevronRight, Loader2
} from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface LeagueEntry {
  rank: number
  prev_rank: number | null
  user_id: string
  display_name: string
  balance: number
  total_bets: number
  won_bets: number
  win_rate: number
  movement: 'up' | 'down' | 'same' | 'new'
  movement_places: number
}

function MovementBadge({ movement, places }: { movement: string; places: number }) {
  if (movement === 'up') return (
    <span className="flex items-center gap-0.5 text-green-400 font-bold text-xs">
      <TrendingUp className="h-3.5 w-3.5" />
      <span>{places}</span>
    </span>
  )
  if (movement === 'down') return (
    <span className="flex items-center gap-0.5 text-red-400 font-bold text-xs">
      <TrendingDown className="h-3.5 w-3.5" />
      <span>{places}</span>
    </span>
  )
  if (movement === 'new') return (
    <span className="text-[10px] font-bold text-primary px-1 py-0.5 rounded bg-primary/20">NEW</span>
  )
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
      style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }}>
      <Crown className="h-4 w-4" />
    </div>
  )
  if (rank === 2) return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
      style={{ background: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#000' }}>2</div>
  )
  if (rank === 3) return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
      style={{ background: 'linear-gradient(135deg, #CD7F32, #A0522D)', color: '#fff' }}>3</div>
  )
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-muted-foreground"
      style={{ background: 'oklch(0.18 0.03 240)', border: '1px solid oklch(0.30 0.05 240)' }}>
      {rank}
    </div>
  )
}

export default function BetFantasyLeaguePage() {
  const [entries, setEntries] = useState<LeagueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRank, setCurrentUserRank] = useState<LeagueEntry | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id ?? null
        setCurrentUserId(uid)

        // Fetch all accounts with at least 3 bets placed
        const { data: accounts } = await supabase
          .from('fantasy_accounts')
          .select('user_id, display_name, balance, total_wagered')
          .order('balance', { ascending: false })

        if (!accounts) return

        // Count bets per user — only qualify with 3+ bets
        const { data: betCounts } = await supabase
          .from('fantasy_bets')
          .select('user_id')

        const betCountMap: Record<string, number> = {}
        for (const b of betCounts ?? []) {
          betCountMap[b.user_id] = (betCountMap[b.user_id] ?? 0) + 1
        }

        // Won bets per user
        const { data: wonBets } = await supabase
          .from('fantasy_bets')
          .select('user_id')
          .eq('status', 'won')

        const wonMap: Record<string, number> = {}
        for (const b of wonBets ?? []) {
          wonMap[b.user_id] = (wonMap[b.user_id] ?? 0) + 1
        }

        // Filter: must have 3+ bets
        const qualified = accounts.filter(a => (betCountMap[a.user_id] ?? 0) >= 3)
        setTotalPlayers(qualified.length)

        // Top 40 only for the league
        const top40 = qualified.slice(0, 40)

        const mapped: LeagueEntry[] = top40.map((a, i) => {
          const totalBets = betCountMap[a.user_id] ?? 0
          const won = wonMap[a.user_id] ?? 0
          return {
            rank: i + 1,
            prev_rank: null, // future: store in DB
            user_id: a.user_id,
            display_name: a.display_name || 'Player',
            balance: a.balance,
            total_bets: totalBets,
            won_bets: won,
            win_rate: totalBets > 0 ? Math.round((won / totalBets) * 100) : 0,
            movement: 'same',
            movement_places: 0,
          }
        })

        setEntries(mapped)

        // Find current user's entry (even if outside top 40)
        if (uid) {
          const userIdx = qualified.findIndex(a => a.user_id === uid)
          if (userIdx >= 0) {
            const a = qualified[userIdx]
            const totalBets = betCountMap[uid] ?? 0
            const won = wonMap[uid] ?? 0
            setCurrentUserRank({
              rank: userIdx + 1,
              prev_rank: null,
              user_id: uid,
              display_name: a.display_name || 'You',
              balance: a.balance,
              total_bets: totalBets,
              won_bets: won,
              win_rate: totalBets > 0 ? Math.round((won / totalBets) * 100) : 0,
              movement: 'same',
              movement_places: 0,
            })
          }
        }
      } catch (e) {
        console.error('League load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const isCurrentUser = (uid: string) => uid === currentUserId
  const userInTop40 = currentUserRank && currentUserRank.rank <= 40

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">

        {/* ── Hero Banner ── */}
        <div className="relative mb-8 overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, oklch(0.10 0.04 240) 0%, oklch(0.08 0.06 220) 50%, oklch(0.10 0.04 240) 100%)',
            border: '1px solid oklch(0.70 0.22 220 / 0.25)',
          }}>
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 20% 50%, oklch(0.70 0.22 220 / 0.08) 0%, transparent 60%)' }} />

          <div className="relative flex flex-col lg:flex-row items-center gap-6 p-6 lg:p-8">
            {/* Left — branding */}
            <div className="lg:w-1/3 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">BetVision</p>
                  <p className="text-sm font-black text-primary tracking-wide">FANTASY LEAGUE</p>
                </div>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black leading-tight mb-2">
                THE TITLE RACE<br />
                <span style={{ color: 'oklch(0.70 0.22 220)' }}>IS ON!</span>
              </h1>
              <p className="text-sm text-muted-foreground mb-4">Every bet. Every point. Every position matters.</p>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {[
                  { icon: Users, label: `${totalPlayers} Players` },
                  { icon: Trophy, label: 'Top 40 League' },
                  { icon: Zap, label: 'Live Rankings' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{ background: 'oklch(0.70 0.22 220 / 0.12)', border: '1px solid oklch(0.70 0.22 220 / 0.25)', color: 'oklch(0.80 0.20 210)' }}>
                    <Icon className="h-3 w-3" /> {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — feature pills */}
            <div className="lg:w-2/3 grid grid-cols-2 gap-3">
              {[
                { icon: Target, title: 'REAL COMPETITION', desc: 'Compete against players across Zimbabwe' },
                { icon: Zap, title: 'LIVE RANKINGS', desc: 'Real-time updates as bets settle' },
                { icon: TrendingUp, title: 'CLAIM YOUR SPOT', desc: 'Climb the leaderboard and stay on top' },
                { icon: Star, title: 'TOP 40 ONLY', desc: 'Only the best make the league table' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: 'oklch(0.13 0.03 240 / 0.6)', border: '1px solid oklch(0.60 0.15 220 / 0.15)' }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-wider" style={{ color: 'oklch(0.70 0.22 220)' }}>{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main layout: leaderboard + sidebar ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Leaderboard ── */}
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: 'oklch(0.13 0.03 240 / 0.7)',
              backdropFilter: 'blur(16px)',
              border: '1px solid oklch(0.60 0.15 220 / 0.18)',
            }}>

            {/* Table header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid oklch(0.60 0.15 220 / 0.12)', background: 'oklch(0.11 0.02 240 / 0.5)' }}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold tracking-wide uppercase text-muted-foreground">Top 40 League</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Column labels */}
            <div className="grid grid-cols-[40px_32px_1fr_64px_64px_80px] items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold"
              style={{ borderBottom: '1px solid oklch(0.60 0.15 220 / 0.08)' }}>
              <span>Rank</span>
              <span></span>
              <span>Player</span>
              <span className="text-center">Bets</span>
              <span className="text-center">Win%</span>
              <span className="text-right">Balance</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading league...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Trophy className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">No players qualify yet</p>
                <p className="text-xs text-muted-foreground">Place at least 3 bets to enter the league</p>
              </div>
            ) : (
              <div>
                {entries.map((entry) => {
                  const isMe = isCurrentUser(entry.user_id)
                  return (
                    <div
                      key={entry.user_id}
                      className="grid grid-cols-[40px_32px_1fr_64px_64px_80px] items-center gap-2 px-4 py-3 transition-colors"
                      style={{
                        borderBottom: '1px solid oklch(0.60 0.15 220 / 0.07)',
                        background: isMe
                          ? 'linear-gradient(90deg, oklch(0.70 0.22 220 / 0.12), oklch(0.70 0.22 220 / 0.04))'
                          : entry.rank <= 3 ? 'oklch(0.70 0.22 220 / 0.03)' : 'transparent',
                        borderLeft: isMe ? '2px solid oklch(0.70 0.22 220)' : '2px solid transparent',
                      }}
                    >
                      {/* Rank */}
                      <RankBadge rank={entry.rank} />

                      {/* Movement */}
                      <div className="flex justify-center">
                        <MovementBadge movement={entry.movement} places={entry.movement_places} />
                      </div>

                      {/* Name */}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {entry.display_name}
                          {isMe && (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'oklch(0.70 0.22 220 / 0.2)', color: 'oklch(0.70 0.22 220)' }}>
                              You
                            </span>
                          )}
                        </p>
                        {entry.rank <= 3 && (
                          <p className="text-[10px] text-muted-foreground">{entry.won_bets} wins</p>
                        )}
                      </div>

                      {/* Bets */}
                      <p className="text-center text-xs text-muted-foreground">{entry.total_bets}</p>

                      {/* Win rate */}
                      <p className="text-center text-xs font-semibold"
                        style={{ color: entry.win_rate >= 60 ? 'oklch(0.80 0.20 195)' : entry.win_rate >= 40 ? 'oklch(0.80 0.20 80)' : 'oklch(0.62 0.22 25)' }}>
                        {entry.win_rate}%
                      </p>

                      {/* Balance */}
                      <p className="text-right text-sm font-bold"
                        style={{ color: 'oklch(0.70 0.22 220)' }}>
                        ${entry.balance.toFixed(2)}
                      </p>
                    </div>
                  )
                })}

                {/* Ellipsis if more than 40 */}
                {totalPlayers > 40 && (
                  <div className="px-4 py-2 text-center text-xs text-muted-foreground"
                    style={{ borderBottom: '1px solid oklch(0.60 0.15 220 / 0.07)' }}>
                    ···
                  </div>
                )}
              </div>
            )}

            {/* Movement legend */}
            <div className="flex items-center justify-center gap-6 px-4 py-3 text-xs text-muted-foreground"
              style={{ borderTop: '1px solid oklch(0.60 0.15 220 / 0.10)' }}>
              <span className="flex items-center gap-1 text-green-400"><TrendingUp className="h-3 w-3" /> Moved Up</span>
              <span className="flex items-center gap-1 text-red-400"><TrendingDown className="h-3 w-3" /> Moved Down</span>
              <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> No Change</span>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Your rank card */}
            {currentUserRank ? (
              <div className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.13 0.06 240 / 0.9), oklch(0.10 0.04 240 / 0.9))',
                  border: '1px solid oklch(0.70 0.22 220 / 0.30)',
                }}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Your League Status</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">{currentUserRank.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {userInTop40 ? '🏆 In the Top 40 League' : `Rank #${currentUserRank.rank} — outside league`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: 'Balance', value: `$${currentUserRank.balance.toFixed(2)}`, color: 'oklch(0.70 0.22 220)' },
                    { label: 'Rank', value: `#${currentUserRank.rank}`, color: 'oklch(0.80 0.20 80)' },
                    { label: 'Bets', value: currentUserRank.total_bets, color: 'inherit' },
                    { label: 'Win Rate', value: `${currentUserRank.win_rate}%`, color: currentUserRank.win_rate >= 50 ? 'oklch(0.80 0.20 195)' : 'oklch(0.62 0.22 25)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg p-2.5"
                      style={{ background: 'oklch(0.10 0.03 240 / 0.6)', border: '1px solid oklch(0.60 0.15 220 / 0.12)' }}>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
                {!userInTop40 && (
                  <div className="rounded-lg p-2.5 text-xs text-center"
                    style={{ background: 'oklch(0.62 0.22 25 / 0.10)', border: '1px solid oklch(0.62 0.22 25 / 0.20)', color: 'oklch(0.75 0.18 30)' }}>
                    You need to reach <strong>Top 40</strong> to enter the league. Keep betting!
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl p-4 text-center"
                style={{ background: 'oklch(0.13 0.03 240 / 0.7)', border: '1px solid oklch(0.60 0.15 220 / 0.18)' }}>
                <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold mb-1">Join the League</p>
                <p className="text-xs text-muted-foreground mb-3">Sign in and place 3+ bets to qualify</p>
                <a href="/results"
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                  style={{ background: 'oklch(0.70 0.22 220)', color: '#000' }}>
                  <Zap className="h-4 w-4" /> Play BetVision
                </a>
              </div>
            )}

            {/* How it works */}
            <div className="rounded-2xl p-4"
              style={{ background: 'oklch(0.13 0.03 240 / 0.7)', border: '1px solid oklch(0.60 0.15 220 / 0.18)' }}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">How It Works</p>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Place at least 3 bets to qualify for the league' },
                  { step: '2', text: 'Your balance determines your rank — higher balance = higher rank' },
                  { step: '3', text: 'Only the top 40 players appear in the league table' },
                  { step: '4', text: 'Overtake someone → green arrow. Get overtaken → red arrow' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                      style={{ background: 'oklch(0.70 0.22 220 / 0.2)', color: 'oklch(0.70 0.22 220)' }}>
                      {step}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats card */}
            <div className="rounded-2xl p-4"
              style={{ background: 'oklch(0.13 0.03 240 / 0.7)', border: '1px solid oklch(0.60 0.15 220 / 0.18)' }}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">League Stats</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Total Qualified Players', value: totalPlayers },
                  { label: 'League Spots Taken', value: Math.min(entries.length, 40) },
                  { label: 'Spots Remaining', value: Math.max(0, 40 - entries.length) },
                  { label: 'Leader Balance', value: entries[0] ? `$${entries[0].balance.toFixed(2)}` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-bold" style={{ color: 'oklch(0.70 0.22 220)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl p-4 text-center overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, oklch(0.15 0.06 240), oklch(0.10 0.04 220))',
                border: '1px solid oklch(0.70 0.22 220 / 0.30)',
              }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, oklch(0.70 0.22 220 / 0.10) 0%, transparent 70%)' }} />
              <p className="relative text-lg font-black mb-1">OVERTAKE.<br />
                <span style={{ color: 'oklch(0.70 0.22 220)' }}>BE OVERTAKEN.</span>
              </p>
              <p className="relative text-xs text-muted-foreground mb-3">The league never stops. The Top 40 only gets stronger.</p>
              <a href="/results"
                className="relative flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, oklch(0.70 0.22 220), oklch(0.60 0.25 200))', color: '#000' }}>
                <Zap className="h-4 w-4" /> Play Bet Fantasy League
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

          </div>
        </div>

        {/* Bottom feature strip */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Zap, label: 'Real-Time Leaderboard' },
            { icon: TrendingUp, label: 'Live Position Changes' },
            { icon: Trophy, label: 'Top 40 League' },
            { icon: Shield, label: 'Min 3 Bets to Qualify' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'oklch(0.13 0.03 240 / 0.5)', border: '1px solid oklch(0.60 0.15 220 / 0.12)' }}>
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs font-semibold">{label}</span>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
