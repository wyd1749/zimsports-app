'use client'

import { RatingBar, FormIndicator } from '@/components/stats-display'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Team, TeamSeasonStats } from '@/lib/types'

// ── Team Ranking Card ─────────────────────────────────────────────────────────
interface TeamRankingCardProps {
  team: Team
  stats: TeamSeasonStats
  rank: number
  className?: string
}

export function TeamRankingCard({ team, stats, rank, className }: TeamRankingCardProps) {
  const winRate =
    stats.matches_played > 0
      ? ((stats.wins / stats.matches_played) * 100).toFixed(0)
      : '0'

  const getTrendIcon = () => {
    if (stats.win_streak > 2) return <TrendingUp className="h-4 w-4" style={{ color: 'oklch(0.80 0.20 195)' }} />
    if (stats.win_streak < 0) return <TrendingDown className="h-4 w-4" style={{ color: 'oklch(0.62 0.22 25)' }} />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const rankStyle =
    rank === 1
      ? { background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }
      : rank === 2
      ? { background: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#000' }
      : rank === 3
      ? { background: 'linear-gradient(135deg, #CD7F32, #A0522D)', color: '#fff' }
      : { background: 'oklch(0.18 0.03 240)', color: 'oklch(0.55 0.02 230)' }

  return (
    <div
      className={cn('rounded-xl overflow-hidden card-hover', className)}
      style={{
        background: 'oklch(0.13 0.03 240 / 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: rank <= 3 ? '1px solid oklch(0.70 0.22 220 / 0.25)' : '1px solid oklch(0.60 0.15 220 / 0.15)',
      }}
    >
      {/* Top accent line for top 3 */}
      {rank <= 3 && (
        <div className="h-0.5"
          style={{ background: 'linear-gradient(90deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195), transparent)' }} />
      )}

      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Rank badge */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black"
            style={rankStyle}
          >
            {rank}
          </div>

          {/* Team info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold truncate text-sm">{team.name}</h3>
              {getTrendIcon()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{team.city}</p>

            {/* Record */}
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className="font-bold" style={{ color: 'oklch(0.80 0.18 210)' }}>{stats.wins}W</span>
              <span className="font-bold" style={{ color: 'oklch(0.62 0.22 25)' }}>{stats.losses}L</span>
              <span className="text-xs text-muted-foreground">{winRate}% Win</span>
            </div>

            <div className="mt-2">
              <FormIndicator form={stats.current_form} />
            </div>
          </div>

          {/* Power ranking */}
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Power</p>
            <p className="text-2xl font-black text-gradient" style={{ fontFamily: 'var(--font-orbitron, monospace)' }}>
              {team.power_ranking?.toFixed(1) || '0.0'}
            </p>
          </div>
        </div>

        {/* Rating bars */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <RatingBar value={team.attack_rating || 0} label="Attack" />
          <RatingBar value={team.defense_rating || 0} label="Defense" />
          <RatingBar value={team.form_rating || 0} label="Form" />
        </div>

        {/* Stats footer */}
        <div className="mt-3 flex items-center justify-between pt-3 text-xs"
          style={{ borderTop: '1px solid oklch(0.60 0.15 220 / 0.12)' }}>
          <span className="text-muted-foreground">PF: <span className="font-semibold text-foreground">{stats.points_for}</span></span>
          <span className="text-muted-foreground">PA: <span className="font-semibold text-foreground">{stats.points_against}</span></span>
          <span className="font-bold"
            style={{ color: stats.point_differential >= 0 ? 'oklch(0.80 0.20 195)' : 'oklch(0.62 0.22 25)' }}>
            {stats.point_differential > 0 ? '+' : ''}{stats.point_differential}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Standings Table ───────────────────────────────────────────────────────────
interface StandingsTableProps {
  standings: any[]
  className?: string
}

export function StandingsTable({ standings, className }: StandingsTableProps) {
  return (
    <div
      className={cn('rounded-xl overflow-hidden', className)}
      style={{
        background: 'oklch(0.13 0.03 240 / 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid oklch(0.60 0.15 220 / 0.18)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid oklch(0.60 0.15 220 / 0.12)' }}>
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">League Standings</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'oklch(0.11 0.02 240 / 0.5)', borderBottom: '1px solid oklch(0.60 0.15 220 / 0.1)' }}
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left">#</th>
              <th className="px-4 py-2.5 text-left">Team</th>
              <th className="px-4 py-2.5 text-center">P</th>
              <th className="px-4 py-2.5 text-center">W</th>
              <th className="px-4 py-2.5 text-center">L</th>
              <th className="px-4 py-2.5 text-center hidden sm:table-cell">PF</th>
              <th className="px-4 py-2.5 text-center hidden sm:table-cell">PA</th>
              <th className="px-4 py-2.5 text-center">+/-</th>
              <th className="px-4 py-2.5 text-center hidden md:table-cell">Form</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((stat, index) => (
              <tr
                key={stat.team?.id ?? stat.id ?? index}
                className="transition-colors"
                style={{ borderBottom: '1px solid oklch(0.60 0.15 220 / 0.08)' }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.background = 'oklch(0.70 0.22 220 / 0.06)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                }}
              >
                <td className="px-4 py-3 font-bold text-xs w-8">
                  {index < 3 ? (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-black"
                      style={
                        index === 0
                          ? { background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }
                          : index === 1
                          ? { background: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#000' }
                          : { background: 'linear-gradient(135deg, #CD7F32, #A0522D)', color: '#fff' }
                      }
                    >
                      {index + 1}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{index + 1}</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <p className="font-semibold text-xs">{stat.team?.name ?? stat.name}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.team?.city ?? stat.city}</p>
                </td>

                <td className="px-4 py-3 text-center text-xs text-muted-foreground">{stat.matches_played}</td>

                <td className="px-4 py-3 text-center text-xs font-bold" style={{ color: 'oklch(0.80 0.18 210)' }}>
                  {stat.wins}
                </td>

                <td className="px-4 py-3 text-center text-xs font-bold" style={{ color: 'oklch(0.62 0.22 25)' }}>
                  {stat.losses}
                </td>

                <td className="px-4 py-3 text-center text-xs text-muted-foreground hidden sm:table-cell">{stat.points_for}</td>
                <td className="px-4 py-3 text-center text-xs text-muted-foreground hidden sm:table-cell">{stat.points_against}</td>

                <td className="px-4 py-3 text-center text-xs font-bold"
                  style={{ color: stat.point_differential > 0 ? 'oklch(0.80 0.20 195)' : 'oklch(0.62 0.22 25)' }}>
                  {stat.point_differential > 0 ? '+' : ''}{stat.point_differential}
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  <FormIndicator form={stat.current_form} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
