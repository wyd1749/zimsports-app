'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  TOP_LEVEL_LEAGUES,
  FOOTBALL_LEAGUES,
  isFootballLeague,
  type LeagueId,
} from '@/lib/leagues'
import { cn } from '@/lib/utils'

interface LeagueSwitcherProps {
  currentLeague: LeagueId
}

export default function LeagueSwitcher({ currentLeague }: LeagueSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      })
    }
  }, [dropdownOpen])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSwitch(id: LeagueId) {
    setDropdownOpen(false)
    router.push(`${pathname}?league=${id}`)
  }

  const footballActive = isFootballLeague(currentLeague)
  const activeFootballLeague = footballActive
    ? FOOTBALL_LEAGUES.find((l) => l.id === currentLeague)
    : null

  const pillBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    cursor: 'pointer',
    border: '1px solid transparent',
  }

  const pillActive: React.CSSProperties = {
    ...pillBase,
    background: 'linear-gradient(135deg, oklch(0.70 0.22 220 / 0.25), oklch(0.80 0.20 195 / 0.20))',
    border: '1px solid oklch(0.70 0.22 220 / 0.4)',
    color: 'oklch(0.85 0.15 210)',
    boxShadow: '0 0 12px oklch(0.70 0.22 220 / 0.2)',
  }

  const pillInactive: React.CSSProperties = {
    ...pillBase,
    background: 'transparent',
    color: 'oklch(0.55 0.02 230)',
  }

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TOP_LEVEL_LEAGUES.map((league) => (
          <button
            key={league.id}
            onClick={() => handleSwitch(league.id)}
            style={currentLeague === league.id ? pillActive : pillInactive}
            onMouseEnter={(e) => {
              if (currentLeague !== league.id)
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  color: 'oklch(0.85 0.10 220)',
                  background: 'oklch(0.18 0.03 240 / 0.5)',
                })
            }}
            onMouseLeave={(e) => {
              if (currentLeague !== league.id)
                Object.assign((e.currentTarget as HTMLButtonElement).style, {
                  color: 'oklch(0.55 0.02 230)',
                  background: 'transparent',
                })
            }}
          >
            <span>{league.flag}</span>
            <span>{league.shortName}</span>
          </button>
        ))}

        {/* Football dropdown trigger */}
        <button
          ref={buttonRef}
          onClick={() => setDropdownOpen((v) => !v)}
          style={footballActive ? pillActive : pillInactive}
          onMouseEnter={(e) => {
            if (!footballActive)
              Object.assign((e.currentTarget as HTMLButtonElement).style, {
                color: 'oklch(0.85 0.10 220)',
                background: 'oklch(0.18 0.03 240 / 0.5)',
              })
          }}
          onMouseLeave={(e) => {
            if (!footballActive)
              Object.assign((e.currentTarget as HTMLButtonElement).style, {
                color: 'oklch(0.55 0.02 230)',
                background: 'transparent',
              })
          }}
        >
          <span>⚽</span>
          <span>{activeFootballLeague ? activeFootballLeague.shortName : 'Football'}</span>
          <ChevronDown
            className={cn('w-3 h-3 transition-transform duration-200', dropdownOpen && 'rotate-180')}
          />
        </button>
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 99999,
            width: '230px',
            background: 'oklch(0.12 0.03 240 / 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid oklch(0.60 0.15 220 / 0.2)',
            borderRadius: '14px',
            boxShadow: '0 24px 60px oklch(0.05 0.02 240 / 0.8), 0 0 0 1px oklch(0.70 0.22 220 / 0.08)',
          }}
        >
          <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid oklch(0.60 0.15 220 / 0.12)' }}>
            <p style={{ fontSize: '10px', color: 'oklch(0.55 0.05 220)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              ⚽ Football Leagues
            </p>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '4px' }}>
            {FOOTBALL_LEAGUES.map((league) => {
              const isSelected = currentLeague === league.id
              return (
                <button
                  key={league.id}
                  onClick={() => handleSwitch(league.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left',
                    background: isSelected ? 'oklch(0.70 0.22 220 / 0.15)' : 'transparent',
                    color: isSelected ? 'oklch(0.80 0.18 210)' : 'oklch(0.70 0.02 230)',
                    border: isSelected ? '1px solid oklch(0.70 0.22 220 / 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      Object.assign((e.currentTarget as HTMLButtonElement).style, {
                        background: 'oklch(0.18 0.03 240 / 0.6)',
                        color: 'oklch(0.85 0.05 220)',
                      })
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      Object.assign((e.currentTarget as HTMLButtonElement).style, {
                        background: 'transparent',
                        color: 'oklch(0.70 0.02 230)',
                      })
                  }}
                >
                  <span style={{ fontSize: '16px', width: '22px', textAlign: 'center' }}>{league.flag}</span>
                  <span style={{ flex: 1 }}>{league.name}</span>
                  {isSelected && (
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, oklch(0.70 0.22 220), oklch(0.80 0.20 195))',
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
