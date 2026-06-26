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

// ─── Email + Password Login / Sign Up Modal ───────────────────────────────────
function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (user: any) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) return setError('Please enter your email.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (err) return setError(err.message)
      if (data.user) onSuccess(data.user)
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (err) return setError(err.message)
      if (data.user) onSuccess(data.user)
    }
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
          <h2 className="text-lg font-bold">
            {mode === 'signup' ? 'Join Fantasy Betting' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signup'
              ? <>Start with <span className="text-primary font-semibold">$20 virtual cash</span> — no real money needed</>
              : 'Sign in to continue placing bets'}
          </p>
        </div>

        {mode === 'signup' && (
          <div className="space-y-2 mb-5">
            {['$20 free virtual balance to start', 'Place bets on live odds', 'Track your P&L dashboard', 'Compete with no risk'].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-primary font-bold">✓</span> {f}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2 font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }}
            className="text-primary underline underline-offset-2"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>

        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Free to play · Virtual money only · No deposits
        </p>
      </div>
    </div>
  )
}

// ─── Bet Placement Modal ──────────────────────────────────────────────────────
function BetModal({
  advice,
  balance,
  league,
  onClose,
  onBetPlaced,
}: {
  advice: BetAdvice
  balance: number
  league: string
  onClose: () => void
  onBetPlaced: (newBalance: number) => void
}) {
  const [selectedOption, setSelectedOption] = useState<'home' | 'draw' | 'away' | null>(null)
  const [stake, setStake] = useState('')
  const [placing, setPlacing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const options = [
    { key: 'home' as const, label: advice.homeTeam, odds: parseFloat(advice.odds.home) },
    ...(advice.odds.draw ? [{ key: 'draw' as const, label: 'Draw', odds: parseFloat(advice.odds.draw) }] : []),
    { key: 'away' as const, label: advice.awayTeam, odds: parseFloat(advice.odds.away) },
  ]

  const selectedOdds = options.find(o => o.key === selectedOption)?.odds ?? 0
  const stakeNum = parseFloat(stake) || 0
  const potentialWin = stakeNum * selectedOdds
  const profit = potentialWin - stakeNum

  const quickStakes = [1, 2, 5, 10].filter(s => s <= balance)

  const handlePlace = async () => {
    if (!selectedOption || stakeNum <= 0) return setError('Select an outcome and enter a stake.')
    if (stakeNum > balance) return setError("You don't have enough balance.")
    if (stakeNum < 0.1) return setError('Minimum stake is $0.10.')

    setError('')
    setPlacing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const selectedLabel = options.find(o => o.key === selectedOption)!.label
      const betType = selectedOption === 'home' ? 'Home Win' : selectedOption === 'draw' ? 'Draw' : 'Away Win'

      // Insert bet
      const { error: betErr } = await supabase.from('fantasy_bets').insert({
        user_id: user.id,
        match_id: String(advice.gameId),
        home_team: advice.homeTeam,
        away_team: advice.awayTeam,
        league,
        bet_type: betType,
        odds: selectedOdds,
        stake: stakeNum,
        potential_win: potentialWin,
        status: 'pending',
      })
      if (betErr) throw betErr

      // Deduct balance
      const newBalance = parseFloat((balance - stakeNum).toFixed(2))
      const { error: accErr } = await supabase
        .from('fantasy_accounts')
        .update({ balance: newBalance })
        .eq('user_id', user.id)
      if (accErr) throw accErr

      // Increment total_wagered via rpc (silently ignore if function doesn't exist)
      try {
        await supabase.rpc('increment_wagered', { uid: user.id, amount: stakeNum })
      } catch {
        // rpc not available — ignore
      }

      setSuccess(true)
      onBetPlaced(newBalance)
    } catch (e: any) {
      setError(e.message ?? 'Failed to place bet')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/20">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Place Fantasy Bet</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Balance:</span>
            <span className="text-sm font-bold text-primary">${balance.toFixed(2)}</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                <Trophy className="h-7 w-7 text-green-400" />
              </div>
              <h3 className="font-bold text-lg">Bet Placed!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                ${stakeNum.toFixed(2)} on <span className="text-foreground font-medium">{options.find(o => o.key === selectedOption)?.label}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Potential return: <span className="text-green-400 font-semibold">${potentialWin.toFixed(2)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-3">New balance: <span className="font-semibold text-foreground">${balance.toFixed(2)}</span></p>
              <Button onClick={onClose} className="mt-4 w-full" variant="outline">Done</Button>
            </div>
          ) : (
            <>
              {/* Match */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">{advice.homeTeam} vs {advice.awayTeam}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(advice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              {/* Outcome selection */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Choose outcome</p>
                <div className={`grid gap-2 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {options.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedOption(opt.key)}
                      className={`rounded-xl border p-3 text-center transition-all ${
                        selectedOption === opt.key
                          ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                          : 'border-border bg-secondary/30 hover:border-primary/40'
                      }`}
                    >
                      <p className="text-[10px] text-muted-foreground mb-1 truncate">{opt.label}</p>
                      <p className="text-base font-bold text-foreground">{opt.odds.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">odds</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake input */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Stake amount</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    max={balance}
                    value={stake}
                    onChange={e => { setStake(e.target.value); setError('') }}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border bg-secondary/30 pl-7 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                {quickStakes.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {quickStakes.map(s => (
                      <button
                        key={s}
                        onClick={() => setStake(String(s))}
                        className="flex-1 rounded-lg bg-secondary/50 border border-border text-xs font-medium py-1 hover:border-primary/40 transition-colors"
                      >
                        ${s}
                      </button>
                    ))}
                    <button
                      onClick={() => setStake(balance.toFixed(2))}
                      className="flex-1 rounded-lg bg-secondary/50 border border-border text-xs font-medium py-1 hover:border-primary/40 transition-colors"
                    >
                      Max
                    </button>
                  </div>
                )}
              </div>

              {/* Payout preview */}
              {stakeNum > 0 && selectedOption && (
                <div className="rounded-xl bg-secondary/40 border border-border p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Stake</span>
                    <span className="font-medium">${stakeNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Odds</span>
                    <span className="font-medium">{selectedOdds.toFixed(2)}x</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-muted-foreground">Potential return</span>
                    <span className="text-green-400">${potentialWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Profit if win</span>
                    <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>+${profit.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-destructive text-center">{error}</p>}

              <Button
                onClick={handlePlace}
                disabled={placing || !selectedOption || stakeNum <= 0}
                className="w-full font-semibold gap-2"
              >
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-4 w-4" />}
                Place Bet · ${stakeNum > 0 ? stakeNum.toFixed(2) : '0.00'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fantasy Dashboard Modal ──────────────────────────────────────────────────
function DashboardModal({ account, bets, onClose, onSignOut }: {
  account: FantasyAccount
  bets: FantasyBet[]
  onClose: () => void
  onSignOut: () => void
}) {
  const totalBets = bets.length
  const wonBets = bets.filter(b => b.status === 'won').length
  const lostBets = bets.filter(b => b.status === 'lost').length
  const pendingBets = bets.filter(b => b.status === 'pending').length
  const winRate = totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0
  const totalProfit = account.total_won - account.total_wagered

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/20 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">My Fantasy Account</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Profile */}
          <div className="flex items-center gap-3">
            {account.avatar_url
              ? <img src={account.avatar_url} className="h-10 w-10 rounded-full" alt="avatar" />
              : <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
            }
            <div>
              <p className="font-semibold text-sm">{account.display_name || 'Fantasy Player'}</p>
              <p className="text-xs text-muted-foreground">Demo Account</p>
            </div>
          </div>

          {/* Balance card */}
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Virtual Balance</p>
            <p className="text-3xl font-bold text-primary">${account.balance.toFixed(2)}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalProfit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} overall P&L
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Bets', value: totalBets, color: 'text-foreground' },
              { label: 'Won', value: wonBets, color: 'text-green-400' },
              { label: 'Lost', value: lostBets, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-secondary/40 border border-border p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-secondary/40 border border-border p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Win Rate</p>
              <p className="font-bold text-sm">{winRate}%</p>
            </div>
            <div className="rounded-lg bg-secondary/40 border border-border p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Pending</p>
              <p className="font-bold text-sm">{pendingBets} bets</p>
            </div>
          </div>

          {/* Bet history */}
          {bets.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Recent Bets</p>
              <div className="space-y-2">
                {bets.slice(0, 10).map(bet => (
                  <div key={bet.id} className="rounded-lg bg-secondary/30 border border-border p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{bet.home_team} vs {bet.away_team}</p>
                      <p className="text-[10px] text-muted-foreground">{bet.bet_type} · {bet.odds}x</p>
                      <p className="text-[10px] text-muted-foreground">${bet.stake.toFixed(2)} → ${bet.potential_win.toFixed(2)}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      bet.status === 'won' ? 'bg-green-500/20 text-green-400' :
                      bet.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {bet.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bets.length === 0 && (
            <div className="text-center py-4">
              <Gamepad2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bets yet — place your first bet!</p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button variant="outline" onClick={onSignOut} className="w-full gap-2 text-sm">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
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

      // Group bets by league to avoid fetching the same league multiple times
      const leagueMap: Record<string, any[]> = {}
      for (const bet of pendingBets) {
        const key = (bet.league || 'WC').toUpperCase()
        if (!leagueMap[key]) leagueMap[key] = []
        leagueMap[key].push(bet)
      }

      for (const [leagueKey, leagueBets] of Object.entries(leagueMap)) {
        // Fetch completed games for this league from the fixtures API
        let games: any[] = []
        try {
          const res = await fetch(`/api/fixtures?league=${leagueKey}`)
          if (res.ok) {
            const json = await res.json()
            games = json.games ?? json.data ?? []
          }
        } catch {}

        // Also try the predictions data endpoint as fallback
        if (games.length === 0) {
          try {
            const res2 = await fetch(`/api/predictions/data?league=${leagueKey}`)
            if (res2.ok) {
              const json2 = await res2.json()
              games = json2.games ?? json2.data ?? []
            }
          } catch {}
        }

        // Filter to only finished games
        const finishedGames = games.filter((g: any) =>
          ['Final', 'F', 'FT', 'complete', 'FINISHED'].includes(g.status)
        )

        for (const bet of leagueBets) {
          // Try to match by match_id first, then by team names
          let game = finishedGames.find((g: any) => String(g.id) === String(bet.match_id))

          if (!game) {
            // Fallback: match by home/away team name (case-insensitive, partial match)
            game = finishedGames.find((g: any) => {
              const gh = (g.home_team_short ?? g.home_team?.name ?? '').toLowerCase()
              const ga = (g.away_team_short ?? g.away_team?.name ?? '').toLowerCase()
              const bh = (bet.home_team ?? '').toLowerCase()
              const ba = (bet.away_team ?? '').toLowerCase()
              return (gh.includes(bh.slice(0, 4)) || bh.includes(gh.slice(0, 4))) &&
                     (ga.includes(ba.slice(0, 4)) || ba.includes(ga.slice(0, 4)))
            })
          }

          if (!game) continue

          const homeScore = parseInt(game.home_score ?? game.home_team_score ?? game.home_points ?? 0)
          const awayScore = parseInt(game.away_score ?? game.away_team_score ?? game.away_points ?? 0)

          let matchResult: 'Home Win' | 'Away Win' | 'Draw'
          if (homeScore > awayScore) matchResult = 'Home Win'
          else if (awayScore > homeScore) matchResult = 'Away Win'
          else matchResult = 'Draw'

          const won = bet.bet_type === matchResult
          await supabase.from('fantasy_bets').update({ status: won ? 'won' : 'lost' }).eq('id', bet.id)

          if (won) {
            const { data: acc } = await supabase
              .from('fantasy_accounts')
              .select('balance, total_won')
              .eq('user_id', u.id)
              .single()
            if (acc) {
              await supabase.from('fantasy_accounts').update({
                balance: parseFloat((acc.balance + bet.potential_win).toFixed(2)),
                total_won: parseFloat(((acc.total_won || 0) + bet.potential_win).toFixed(2)),
              }).eq('user_id', u.id)
            }
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
