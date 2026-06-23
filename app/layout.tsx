import type { Metadata } from 'next'
import { Orbitron, Rajdhani } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Zim Sports AI — Analytics & Predictions',
  description:
    'AI-powered sports analytics platform with predictions, fixtures, results, and team rankings for Zimbabwe basketball and more.',
  generator: 'zimsports.ai',
  metadataBase: new URL('https://zimsports-app.vercel.app'),
  openGraph: {
    title: 'Zim Sports AI — Analytics & Predictions',
    description: 'AI-powered sports analytics platform with predictions, fixtures, results, and team rankings.',
    url: 'https://zimsports-app.vercel.app',
    siteName: 'Zim Sports AI',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Zim Sports AI Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zim Sports AI — Analytics & Predictions',
    description: 'AI-powered sports analytics platform with predictions, fixtures, results, and team rankings.',
    images: ['/icon-512.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'icon', url: '/icon-192.png', sizes: '192x192' },
      { rel: 'icon', url: '/icon-512.png', sizes: '512x512' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${orbitron.variable} ${rajdhani.variable}`}>
      <body
        className="font-sans antialiased bg-background text-foreground"
        style={{ fontFamily: 'var(--font-rajdhani), Inter, system-ui, sans-serif' }}
      >
        {children}

        {/* Footer */}
        <footer style={{
          background: 'rgba(0,0,0,0.8)',
          borderTop: '1px solid rgba(0,200,255,0.15)',
          padding: '2rem',
          textAlign: 'center',
          marginTop: 'auto',
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{
              fontFamily: 'var(--font-orbitron)',
              color: '#00c8ff',
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '0.1em',
            }}>
              ZIM SPORTS AI
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <a href="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>Home</a>
            <a href="/predictions" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>Predictions</a>
            <a href="/watch" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>Watch Live</a>
            <a href="/betvision" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>BetVision</a>
            <a href="/admin/livestreams" style={{ color: '#ef4444', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              🔴 Admin
            </a>
          </div>

          <p style={{ color: '#475569', fontSize: '0.75rem' }}>
            © {new Date().getFullYear()} ZimSports AI · Built in Zimbabwe 🇿🇼
          </p>
          <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Developed by <span style={{ color: '#00c8ff' }}>TinasheJMbanje</span> · Contact: 0780501764
          </p>
        </footer>

        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}