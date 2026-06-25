'use client'

import { useState, useEffect, Suspense } from 'react'
import { Header } from '@/components/header'
import {
  TrendingUp, Zap, Shield, AlertTriangle, Star,
  ChevronDown, ChevronUp, Loader2, Target, Flame,
  Gamepad2, X, Trophy, DollarSign, TrendingDown, LogOut, User
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

// ─── Supabase client ──────────────────────────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────
interface BetAdvice {
  gameId: string | number
  homeTeam: string
  awayTeam: string
  date: string
  venue?: string
  recommendation: 'HOME' | 'AWAY' | 'DRAW' | 'AVOID'
  confidence: number
  odds: { home: string; draw?: string; away: string }
  valueRating: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
  keyStats: string[]
  betType: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

interface TeamData {
  id: string
  name: string
  abbreviation: string
  wins: string
  losses: string
}

interface GameData {
  id: string | number
  home_team_id: string
  away_team_id: string
  date: string
  venue?: string
  status: string
}

interface FantasyAccount {
  balance: number
  total_wagered: number
  total_won: number
  display_name: string
  avatar_url: string
}

interface FantasyBet {
  id: string
  home_team: string
  away_team: string
  league: string
  bet_type: string
  odds: number
  stake: number
  potential_win: number
  status: 'pending' | 'won' | 'lost'
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const styles = {
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const icons = { LOW: Shield, MEDIUM: AlertTriangle, HIGH: Flame }
  const Icon = icons[risk]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[risk]}`}>
      <Icon className="h-2.5 w-2.5" /> {risk} RISK
    </span>
  )
}

function ValueBadge({ value }: { value: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const styles = {
    HIGH: 'bg-primary/20 text-primary border-primary/30',
    MEDIUM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    LOW: 'bg-secondary/50 text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[value]}`}>
      <Star className="h-2.5 w-2.5" /> {value} VALUE
    </span>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 55 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-secondary">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-foreground">{value}%</span>
    </div>
  )
}

// ─── Magic Link Login Modal ──────────────────────────────────────────────────
function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (user: any) => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSendLink = async () => {
    if (!email.trim()) return setError('Please enter your email.')
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (err) return setError(err.message)
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Gamepad2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Join Fantasy Betting</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Start with <span className="text-primary font-semibold">$20 virtual cash</span> — no real money needed
          </p>
        </div>

        {!sent ? (
          <>
            <div className="space-y-2 mb-5">
              {['$20 free virtual balance to start', 'Place bets on live odds', 'Track your P&L dashboard', 'Compete with no risk'].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="text-primary font-bold">✓</span> {f}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSendLink()}
                className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button onClick={handleSendLink} disabled={loading} className="w-full gap-2 font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Send Magic Link
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              We'll email you a secure link — no password needed
            </p>
          </>
        ) : (
          <div className="text-center space-y-3 py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
              <Zap className="h-7 w-7 text-green-400" />
            </div>
            <p className="font-semibold text-foreground">Check your inbox!</p>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <span className="text-primary font-medium">{email}</span>. Click it to sign in instantly.
            </p>
            <p className="text-xs text-muted-foreground">Didn't get it? Check spam or{' '}
              <button onClick={() => setSent(false)} className="text-primary underline">try again</button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bet Card ─────────────────────────────────────────────────────────────────
function BetCard({ advice, user, balance, league, onFantasyBet }: {
  advice: BetAdvice
  user: any
  balance: number
  league: string
  onFantasyBet: (advice: BetAdvice) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const recStyles = {
    HOME: 'bg-primary text-primary-foreground',
    AWAY: 'bg-destructive text-destructive-foreground',
    DRAW: 'bg-yellow-500 text-black',
    AVOID: 'bg-secondary text-muted-foreground',
  }

  const recLabel = {
    HOME: `Bet: ${advice.homeTeam}`,
    AWAY: `Bet: ${advice.awayTeam}`,
    DRAW: 'Bet: Draw',
    AVOID: 'Skip This Game',
  }

  return (
    <Card className="overflow-hidden border-border hover:border-primary/40 transition-all">
      {/* Header strip */}
      <div className="flex items-center justify-between bg-secondary/30 px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {new Date(advice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <div className="flex items-center gap-2">
          <RiskBadge risk={advice.riskLevel} />
          <ValueBadge value={advice.valueRating} />
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
              {advice.homeTeam.slice(0, 3).toUpperCase()}
            </div>
            <p className="text-xs font-medium leading-tight">{advice.homeTeam}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">VS</p>
            {advice.venue && <p className="text-[9px] text-muted-foreground">📍 {advice.venue}</p>}
          </div>
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-xs font-bold text-destructive">
              {advice.awayTeam.slice(0, 3).toUpperCase()}
            </div>
            <p className="text-xs font-medium leading-tight">{advice.awayTeam}</p>
          </div>
        </div>

        {/* Odds row */}
        <div className={`grid ${advice.odds.draw ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
          <div className="rounded-lg bg-secondary/50 p-2 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Home</p>
            <p className="text-sm font-bold text-foreground">{advice.odds.home}</p>
          </div>
          {advice.odds.draw && (
            <div className="rounded-lg bg-secondary/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Draw</p>
              <p className="text-sm font-bold text-foreground">{advice.odds.draw}</p>
            </div>
          )}
          <div className="rounded-lg bg-secondary/50 p-2 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Away</p>
            <p className="text-sm font-bold text-foreground">{advice.odds.away}</p>
          </div>
        </div>

        {/* Recommendation */}
        <div className={`rounded-lg px-3 py-2 text-center text-xs font-bold ${recStyles[advice.recommendation]}`}>
          <Target className="inline h-3 w-3 mr-1" />
          {recLabel[advice.recommendation]}
          {advice.betType && <span className="ml-1 opacity-75">· {advice.betType}</span>}
        </div>

        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">AI Confidence</span>
          </div>
          <ConfidenceBar value={advice.confidence} />
        </div>

        {/* Key stats */}
        {advice.keyStats.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">Key Stats</p>
            {advice.keyStats.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded bg-secondary/50 px-2 py-1.5">
                <span className="text-primary text-xs font-bold mt-0.5">▸</span>
                <span className="text-xs text-foreground font-medium">{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* 🎮 Fantasy Bet Button */}
        <Button
          onClick={() => onFantasyBet(advice)}
          className="w-full gap-2 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
          size="sm"
        >
          <Gamepad2 className="h-3.5 w-3.5" />
          Place Fantasy Bet
          {user && <span className="ml-auto text-[10px] opacity-70">${balance.toFixed(2)}</span>}
        </Button>

        {/* Reasoning toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          <Zap className="mr-2 h-3 w-3 text-primary" />
          {expanded ? 'Hide' : 'Show'} AI Reasoning
          {expanded ? <ChevronUp className="ml-auto h-3 w-3" /> : <ChevronDown className="ml-auto h-3 w-3" />}
        </Button>
        {expanded && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <p className="text-xs text-foreground leading-relaxed">{advice.reasoning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function BetCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border animate-pulse">
      <div className="h-9 bg-secondary/30 border-b border-border" />
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className="h-14 rounded bg-secondary/50" />)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0,1].map(i => <div key={i} className="h-10 rounded bg-secondary/50" />)}
        </div>
        <div className="h-9 rounded bg-secondary/50" />
        <div className="h-4 rounded bg-secondary/50" />
        <div className="space-y-1">
          {[0,1,2].map(i => <div key={i} className="h-7 rounded bg-secondary/50" />)}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function BetVisionPage() {
  const searchParams = useSearchParams()
  const league = (searchParams.get('league') ?? 'MBA').toUpperCase()

  const [advices, setAdvices] = useState<BetAdvice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingCount, setLoadingCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Fantasy state
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<FantasyAccount | null>(null)
  const [bets, setBets] = useState<FantasyBet[]>([])
  const [showLogin, setShowLogin] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [activeBetAdvice, setActiveBetAdvice] = useState<BetAdvice | null>(null)
  const [pendingBetAdvice, setPendingBetAdvice] = useState<BetAdvice | null>(null)

  // ── FIX: use getSession() so the cookie written by /auth/callback is picked up ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Standalone loadAccount — called directly after login AND via useEffect on page load
  const loadAccount = async (u: any) => {
    try {
      const { data, error } = await supabase
        .from('fantasy_accounts')
        .select('*')
        .eq('user_id', u.id)
        .single()

      if (data) {
        setAccount(data)
      } else if (error?.code === 'PGRST116') {
        // No account yet — wait for trigger to create it, then retry
        await new Promise(r => setTimeout(r, 1500))
        const { data: retried } = await supabase
          .from('fantasy_accounts')
          .select('*')
          .eq('user_id', u.id)
          .single()
        if (retried) {
          setAccount(retried)
        } else {
          // Trigger didn't fire — insert directly as fallback
          const { data: created } = await supabase
            .from('fantasy_accounts')
            .insert({
              user_id: u.id,
              balance: 20,
              total_wagered: 0,
              total_won: 0,
              display_name: u.user_metadata?.full_name ?? u.email ?? 'Player',
              avatar_url: u.user_metadata?.avatar_url ?? '',
            })
            .select()
            .single()
          if (created) setAccount(created)
        }
      } else {
        console.error('Failed to load account:', error)
      }
    } catch (e) {
      console.error('loadAccount error:', e)
    }

    const { data: betsData } = await supabase
      .from('fantasy_bets')
      .select('*')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false })
    if (betsData) setBets(betsData as FantasyBet[])
  }

  // ─── Auto-settle pending bets based on match results ─────────────────────
  const settleBets = async (u: any) => {
    try {
      const { data: pendingBets } = await supabase
        .from('fantasy_bets')
        .select('*')
        .eq('user_id', u.id)
        .eq('status', 'pending')

      if (!pendingBets || pendingBets.length === 0) return

      for (const bet of pendingBets) {
        const res = await fetch(`/api/predictions/data?league=${bet.league || 'wc'}`)
        if (!res.ok) continue
        const { games } = await res.json()
        const game = games?.find((g: any) => String(g.id) === String(bet.match_id))
        if (!game) continue

        const isFinished = ['Final', 'F', 'FT', 'complete'].includes(game.status)
        if (!isFinished) continue

        const homeScore = parseInt(game.home_team_score ?? game.home_points ?? 0)
        const awayScore = parseInt(game.away_team_score ?? game.away_points ?? 0)

        let matchResult: 'Home Win' | 'Away Win' | 'Draw'
        if (homeScore > awayScore) matchResult = 'Home Win'
        else if (awayScore > homeScore) matchResult = 'Away Win'
        else matchResult = 'Draw'

        const won = bet.bet_type === matchResult
        await supabase.from('fantasy_bets').update({ status: won ? 'won' : 'lost' }).eq('id', bet.id)

        if (won) {
          const { data: acc } = await supabase.from('fantasy_accounts').select('balance, total_won').eq('user_id', u.id).single()
          if (acc) {
            await supabase.from('fantasy_accounts').update({
              balance: parseFloat((acc.balance + bet.potential_win).toFixed(2)),
              total_won: parseFloat(((acc.total_won || 0) + bet.potential_win).toFixed(2)),
            }).eq('user_id', u.id)
          }
        }
      }
      await loadAccount(u)
    } catch (err) {
      console.error('Settlement error:', err)
    }
  }

  // Load account on page load if already logged in
  useEffect(() => {
    if (!user) { setAccount(null); setBets([]); return }
    loadAccount(user).then(() => settleBets(user))
  }, [user])

  // After account loads, open the pending bet modal
  useEffect(() => {
    if (!account || !pendingBetAdvice) return
    setActiveBetAdvice(pendingBetAdvice)
    setPendingBetAdvice(null)
  }, [account])

  const handleLoginSuccess = async (loggedInUser: any) => {
    setShowLogin(false)
    setUser(loggedInUser)
    // Call directly so we don't wait on useEffect timing
    await loadAccount(loggedInUser)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAccount(null)
    setBets([])
    setShowDashboard(false)
  }

  const handleFantasyBet = (advice: BetAdvice) => {
    if (!user) {
      setPendingBetAdvice(advice)
      setShowLogin(true)
      return
    }
    setActiveBetAdvice(advice)
  }

  const handleBetPlaced = (newBalance: number) => {
    setAccount(prev => prev ? { ...prev, balance: newBalance } : prev)
    // Refresh bets
    if (user) {
      supabase.from('fantasy_bets').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => data && setBets(data as FantasyBet[]))
    }
  }

  // Fixtures loading
  useEffect(() => {
    setAdvices([])
    setLoading(true)
    setError(null)
    setLoadingCount(0)

    async function load() {
      try {
        const res = await fetch(`/api/predictions/data?league=${league}`)
        if (!res.ok) throw new Error('Failed to fetch fixtures')
        const { games, teams } = await res.json()

        if (!games || games.length === 0) {
          setLoading(false)
          return
        }

        const teamMap: Record<string, TeamData> = {}
        ;(teams ?? []).forEach((t: TeamData) => { teamMap[t.id] = t })

        const upcoming = (games as GameData[]).filter(g => g.status !== 'Final')
        setTotalCount(upcoming.length)

        for (const game of upcoming) {
          const homeTeam = teamMap[game.home_team_id]
          const awayTeam = teamMap[game.away_team_id]
          if (!homeTeam || !awayTeam) { setLoadingCount(c => c + 1); continue }

          try {
            const aiRes = await fetch('/api/ai/betvision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ homeTeam, awayTeam, league, gameId: game.id, date: game.date, venue: game.venue }),
            })
            if (aiRes.ok) {
              const advice = await aiRes.json()
              setAdvices(prev => [...prev, { ...advice, gameId: game.id, homeTeam: homeTeam.name, awayTeam: awayTeam.name, date: game.date, venue: game.venue }])
            }
          } catch {}
          setLoadingCount(c => c + 1)
          await new Promise(r => setTimeout(r, 400))
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [league])

  const highValue = advices.filter(a => a.valueRating === 'HIGH')
  const others = advices.filter(a => a.valueRating !== 'HIGH')

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              BetVision
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered betting insights and odds analysis</p>
          </div>

          {/* Fantasy entry point */}
          {user && account ? (
            <button
              onClick={() => setShowDashboard(true)}
              className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 hover:bg-primary/15 transition-colors"
            >
              <Gamepad2 className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground leading-none">Fantasy Balance</p>
                <p className="text-sm font-bold text-primary leading-tight">${account.balance.toFixed(2)}</p>
              </div>
            </button>
          ) : (
            <Button
              onClick={() => setShowLogin(true)}
              variant="outline"
              size="sm"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Gamepad2 className="h-4 w-4" />
              Play Fantasy Betting
            </Button>
          )}
        </div>

        {/* Progress indicator while loading */}
        {loading && totalCount > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-secondary/20 px-4 py-3 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-xs text-foreground font-medium">Analysing fixtures with AI...</p>
              <div className="mt-1 h-1 rounded-full bg-secondary">
                <div
                  className="h-1 rounded-full bg-primary transition-all"
                  style={{ width: `${totalCount > 0 ? (loadingCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{loadingCount}/{totalCount}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* High value picks */}
        {(highValue.length > 0 || (loading && advices.length === 0)) && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Flame className="h-3 w-3 text-primary" /> Best Picks
              </Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && advices.length === 0
                ? [0,1,2].map(i => <BetCardSkeleton key={i} />)
                : highValue.map((a, i) => (
                  <BetCard
                    key={`hv-${a.gameId}-${i}`}
                    advice={a}
                    user={user}
                    balance={account?.balance ?? 0}
                    league={league}
                    onFantasyBet={handleFantasyBet}
                  />
                ))
              }
            </div>
          </section>
        )}

        {/* All other picks */}
        {(others.length > 0 || (loading && advices.length > 0)) && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <Badge variant="secondary" className="text-xs">All Fixtures</Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && loadingCount < totalCount && <BetCardSkeleton />}
              {others.map((a, i) => (
                <BetCard
                  key={`ot-${a.gameId}-${i}`}
                  advice={a}
                  user={user}
                  balance={account?.balance ?? 0}
                  league={league}
                  onFantasyBet={handleFantasyBet}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!loading && advices.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No upcoming fixtures to analyse</p>
            <p className="text-sm text-muted-foreground mt-1">Check back when games are scheduled</p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          BetVision is for entertainment purposes only. Fantasy betting uses virtual currency only. Bet responsibly.
        </p>

      </main>

      {/* Modals */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}
      {activeBetAdvice && !account && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background p-8 shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading your account…</p>
          </div>
        </div>
      )}
      {activeBetAdvice && account && (
        <BetModal
          advice={activeBetAdvice}
          balance={account.balance}
          league={league}
          onClose={() => setActiveBetAdvice(null)}
          onBetPlaced={handleBetPlaced}
        />
      )}
      {showDashboard && account && (
        <DashboardModal
          account={account}
          bets={bets}
          onClose={() => setShowDashboard(false)}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  )
}

// ─── Suspense Wrapper (required for useSearchParams) ──────────────────────────
export default function BetVisionPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <BetVisionPage />
    </Suspense>
  )
}
