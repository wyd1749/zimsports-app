import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || 'football highlights 2026'

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY not configured' }, { status: 500 })
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('q', q)
    url.searchParams.set('type', 'video')
    url.searchParams.set('order', 'date')
    url.searchParams.set('maxResults', '16')
    url.searchParams.set('videoCategoryId', '17') // Sports category
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } }) // cache 1 hour
    if (!res.ok) {
      const err = await res.json()
      console.error('YouTube API error:', err)
      return NextResponse.json({ error: 'YouTube API error', detail: err }, { status: 500 })
    }

    const data = await res.json()

    const videos = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }))

    return NextResponse.json({ videos })
  } catch (err: any) {
    console.error('YouTube fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 })
  }
}
