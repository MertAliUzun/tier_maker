import { NextResponse } from 'next/server'

type AnimeItem = { id: string; label: string; image?: string; tierId: null }

async function loadFromMyAnimeList(username: string): Promise<AnimeItem[]> {
  const response = await fetch(`https://myanimelist.net/animelist/${encodeURIComponent(username)}`, {
    headers: { Accept: 'text/html,application/xhtml+xml' },
    next: { revalidate: 300 },
  })

  if (!response.ok) throw new Error('MyAnimeList profile unavailable')

  const html = await response.text()
  const encodedItems = html.match(/data-items="([^"]*)"/i)?.[1]
  if (!encodedItems) throw new Error('MyAnimeList anime list was not found')

  const decodedItems = encodedItems
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
  const entries = JSON.parse(decodedItems) as Array<Record<string, unknown>>

  return entries
    .filter((entry) => entry.anime_id && (entry.anime_title_eng || entry.anime_title))
    .map((entry) => ({
      id: `anime-${entry.anime_id}`,
      label: String(entry.anime_title_eng || entry.anime_title),
      image: typeof entry.anime_image_path === 'string' ? entry.anime_image_path : undefined,
      tierId: null,
    }))
}

export async function GET(request: Request) {
  const rawUsername = new URL(request.url).searchParams.get('username')?.trim()
  const username = rawUsername
    ?.replace(/^(?:https?:\/\/)?(?:www\.)?myanimelist\.net\/(?:animelist|profile)\//i, '')
    .split(/[/?#]/)[0]
    .trim()

  if (!username) {
    return NextResponse.json({ message: 'A MyAnimeList username or animelist URL is required.' }, { status: 400 })
  }

  try {
    const items: AnimeItem[] = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage && page <= 10) {
      const response = await fetch(`https://api.jikan.moe/v4/users/${encodeURIComponent(username)}/animelist?page=${page}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      })

      if (!response.ok) {
        const fallbackItems = await loadFromMyAnimeList(username)
        return NextResponse.json({ items: fallbackItems })
      }

      const payload = await response.json()
      items.push(...(payload.data ?? [])
        .filter((entry: any) => entry?.mal_id && entry?.title)
        .map((entry: any) => ({
          id: `anime-${entry.mal_id}`,
          label: entry.title,
          image: entry.images?.jpg?.large_image_url ?? entry.images?.jpg?.image_url ?? entry.images?.webp?.large_image_url,
          tierId: null as null,
        })))
      hasNextPage = Boolean(payload.pagination?.has_next_page)
      page += 1
    }

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ message: 'MyAnimeList could not be reached. Please try again.' }, { status: 502 })
  }
}
