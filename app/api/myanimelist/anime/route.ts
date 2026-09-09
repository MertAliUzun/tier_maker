import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get('username')?.trim()

  if (!username) {
    return NextResponse.json({ message: 'A MyAnimeList username is required.' }, { status: 400 })
  }

  const response = await fetch(`https://api.jikan.moe/v4/users/${encodeURIComponent(username)}/animelist/full`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    return NextResponse.json({ message: 'Could not load that MyAnimeList profile.' }, { status: response.status })
  }

  const payload = await response.json()
  const items = (payload.data ?? []).map((entry: any) => ({
    id: `anime-${entry.mal_id}`,
    label: entry.title,
    image: entry.images?.jpg?.large_image_url ?? entry.images?.jpg?.image_url,
    tierId: null,
  }))

  return NextResponse.json({ items })
}
