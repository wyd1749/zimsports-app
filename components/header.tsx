'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Menu, X, Zap, Activity } from 'lucide-react'
import LeagueSwitcher from './league-switcher'
import { type LeagueId } from '@/lib/leagues'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/',            label: 'Dashboard',   emoji: '⚡' },
  { href: '/fixtures',    label: 'Fixtures',    emoji: '📅' },
  { href: '/predictions', label: 'Predictions', emoji: '🤖' },
  { href: '/results',     label: 'BetVision',   emoji: '💰' },
  { href: '/league',      label: 'League',      emoji: '🏆' },
  { href: '/rankings',    label: 'Rankings',    emoji: '📊' },
  { href: '/watch',       label: 'Watch Live',  emoji: '📺' },
]

const SWITCHER_PATHS = ['/', '/fixtures', '/predictions', '/results', '/rankings']

function HeaderInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentLeague = (searchParams.get('league') ?? 'MBA') as LeagueId
  const showSwitcher = SWITCHER_PATHS.includes(pathname)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 w-full"
      style={{
        background: 'oklch(0.09 0.02 240 / 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid oklch(0.60 0.15 220 / 0.18)',
        boxShadow: '0 4px 32px oklch(0.70 0.22 220 / 0.08)',
      }}>

      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))' }}>
              <Zap className="w-4 h-4 text-white" fill="currentColor" />
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ boxShadow: '0 0 16px oklch(0.70 0.22 220 / 0.7)' }} />
            </div>
            <span className="font-black text-lg tracking-tight select-none"
              style={{ fontFamily: 'var(--font-orbitron, monospace)' }}>
              <span className="text-white">ZIM</span>
              <span style={{ color: 'oklch(0.80 0.20 195)' }}>SPORTS</span>
              <span className="text-muted-foreground font-normal text-xs ml-1 tracking-widest">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href === '/' || link.href === '/watch'
                    ? link.href
                    : `${link.href}?league=${currentLeague}`}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200',
                    active ? 'text-white' : 'text-muted-foreground hover:text-white',
                    link.href === '/watch' && !active ? 'text-red-400 hover:text-red-300' : ''
                  )}
                  style={active ? {
                    background: 'oklch(0.70 0.22 220 / 0.15)',
                    border: '1px solid oklch(0.70 0.22 220 / 0.3)',
                  } : {}}
                >
                  {active && (
                    <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))' }} />
                  )}
                  {link.emoji} {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Live indicator + mobile toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: 'oklch(0.62 0.22 25 / 0.12)', border: '1px solid oklch(0.62 0.22 25 / 0.25)', color: 'oklch(0.75 0.18 25)' }}>
              <span className="live-dot" />
              LIVE
            </div>
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-white transition-colors"
              style={{ background: 'oklch(0.18 0.03 240 / 0.5)' }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* League switcher bar */}
      {showSwitcher && (
        <div style={{ borderTop: '1px solid oklch(0.60 0.15 220 / 0.12)', background: 'oklch(0.11 0.02 240 / 0.6)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
            <LeagueSwitcher currentLeague={currentLeague} />
          </div>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden px-4 py-3 space-y-1"
          style={{ borderTop: '1px solid oklch(0.60 0.15 220 / 0.15)', background: 'oklch(0.10 0.02 240 / 0.95)' }}>
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href === '/' || link.href === '/watch'
                  ? link.href
                  : `${link.href}?league=${currentLeague}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  active ? 'text-white' : 'text-muted-foreground',
                  link.href === '/watch' && !active ? 'text-red-400' : ''
                )}
                style={active ? {
                  background: 'oklch(0.70 0.22 220 / 0.15)',
                  border: '1px solid oklch(0.70 0.22 220 / 0.25)',
                } : {}}
              >
                <span className="text-base">{link.emoji}</span>
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}

export function Header() {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 w-full h-14"
        style={{ background: 'oklch(0.09 0.02 240 / 0.85)', borderBottom: '1px solid oklch(0.60 0.15 220 / 0.18)' }} />
    }>
      <HeaderInner />
    </Suspense>
  )
}

export default Header