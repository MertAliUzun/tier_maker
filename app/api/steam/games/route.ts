import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { profileUrl } = await request.json();
    const apiKey = process.env.STEAM_API_KEY;

    if (!profileUrl || !apiKey) {
      return NextResponse.json(
        { error: "Missing profile URL or API key." },
        { status: 400 }
      );
    }

    let steamId: string;

    // /profiles/76561198.../
    const profileMatch = profileUrl.match(
      /steamcommunity\.com\/profiles\/(\d+)/
    );

    if (profileMatch) {
      steamId = profileMatch[1];
    } else {
      // /id/nick/
      const vanityMatch = profileUrl.match(
        /steamcommunity\.com\/id\/([^/]+)/
      );

      if (!vanityMatch) {
        return NextResponse.json(
          { error: "Invalid Steam profile URL." },
          { status: 400 }
        );
      }

      const resolveUrl =
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/` +
        `?key=${apiKey}` +
        `&vanityurl=${encodeURIComponent(vanityMatch[1])}`;

      const resolveResponse = await fetch(resolveUrl);
      const resolveData = await resolveResponse.json();

      steamId = resolveData.response?.steamid;

      if (!steamId) {
        return NextResponse.json(
          { error: "Steam profile not found." },
          { status: 404 }
        );
      }
    }

    // Steam oyunlarını getir
    const steamUrl =
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/` +
      `?key=${apiKey}` +
      `&steamid=${steamId}` +
      `&include_appinfo=1` +
      `&include_played_free_games=1`;

    const response = await fetch(steamUrl);
    const data = await response.json();

    const games = data.response?.games;

    // Kütüphane private
    if (!games) {
      return NextResponse.json(
        {
          error: "PRIVATE_LIBRARY",
          message: "Your Steam game library is private.",
        },
        { status: 403 }
      );
    }

    // Item formatına çevir
    const items = games.map((game: any) => ({
      id: String(game.appid),
      label: game.name,
      image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`,
      tierId: null,
    }));

    return NextResponse.json({
      steamId,
      items,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to import Steam games." },
      { status: 500 }
    );
  }
}