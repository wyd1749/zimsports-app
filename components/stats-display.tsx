import { cn } from '@/lib/utils'

// ── Form Indicator ────────────────────────────────────────────────────────────
interface FormIndicatorProps {
  form: string
  className?: string
}

export function FormIndicator({ form, className }: FormIndicatorProps) {
  const results = form.split('').slice(-5)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {results.map((result, index) => (
        <div
          key={index}
          className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
          style={
            result === 'W'
              ? { background: 'oklch(0.70 0.22 220 / 0.25)', color: 'oklch(0.80 0.18 210)', border: '1px solid oklch(0.70 0.22 220 / 0.4)' }
              : result === 'L'
              ? { background: 'oklch(0.62 0.22 25 / 0.2)', color: 'oklch(0.72 0.18 25)', border: '1px solid oklch(0.62 0.22 25 / 0.35)' }
              : { background: 'oklch(0.75 0.18 85 / 0.15)', color: 'oklch(0.78 0.15 85)', border: '1px solid oklch(0.75 0.18 85 / 0.3)' }
          }
        >
          {result}
        </div>
      ))}
    </div>
  )
}

// ── Prediction Bar ────────────────────────────────────────────────────────────
interface PredictionBarProps {
  homeWin: number
  draw?: number
  awayWin: number
  className?: string
}

export function PredictionBar({ homeWin, draw = 0, awayWin, className }: PredictionBarProps) {
  return (
    <div className={cn('flex h-2 w-full overflow-hidden rounded-full', className)}
      style={{ background: 'oklch(0.18 0.02 240)' }}>
      <div
        className="prob-bar-fill h-full rounded-l-full"
        style={{ width: `${homeWin}%`, background: 'linear-gradient(90deg, oklch(0.70 0.22 220), oklch(0.75 0.20 210))' }}
      />
      {draw > 0 && (
        <div
          className="prob-bar-fill h-full"
          style={{ width: `${draw}%`, background: 'oklch(0.55 0.02 230)' }}
        />
      )}
      <div
        className="prob-bar-fill h-full rounded-r-full"
        style={{ width: `${awayWin}%`, background: 'linear-gradient(90deg, oklch(0.75 0.20 195), oklch(0.80 0.18 185))' }}
      />
    </div>
  )
}

// ── Confidence Meter ──────────────────────────────────────────────────────────
interface ConfidenceMeterProps {
  score: number
  className?: string
}

export function ConfidenceMeter({ score, className }: ConfidenceMeterProps) {
  const color =
    score >= 75
      ? 'oklch(0.80 0.20 195)'
      : score >= 50
      ? 'oklch(0.75 0.18 85)'
      : 'oklch(0.62 0.22 25)'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: 'oklch(0.18 0.02 240)' }}>
        <div
          className="h-full rounded-full prob-bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>
        {score.toFixed(0)}%
      </span>
    </div>
  )
}

// ── Rating Bar ────────────────────────────────────────────────────────────────
interface RatingBarProps {
  value: number
  maxValue?: number
  label: string
  className?: string
}

export function RatingBar({ value, maxValue = 100, label, className }: RatingBarProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold" style={{ color: 'oklch(0.80 0.18 210)' }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'oklch(0.18 0.02 240)' }}>
        <div
          className="h-full rounded-full prob-bar-fill"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))',
          }}
        />
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({ label, value, subValue, trend, className }: StatCardProps) {
  return (
    <div
      className={cn('relative rounded-xl p-4 overflow-hidden shimmer', className)}
      style={{
        background: 'oklch(0.13 0.03 240 / 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid oklch(0.60 0.15 220 / 0.18)',
      }}
    >
      {/* Subtle top glow line */}
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, oklch(0.70 0.22 220 / 0.4), transparent)' }} />

      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-black" style={{ fontFamily: 'var(--font-orbitron, monospace)' }}>
          {value}
        </span>
        {subValue && (
          <span
            className="text-xs font-semibold"
            style={{
              color: trend === 'up'
                ? 'oklch(0.80 0.20 195)'
                : trend === 'down'
                ? 'oklch(0.62 0.22 25)'
                : 'oklch(0.55 0.02 230)',
            }}
          >
            {trend === 'up' && '↑ '}{subValue}
          </span>
        )}
      </div>
    </div>
  )
}
