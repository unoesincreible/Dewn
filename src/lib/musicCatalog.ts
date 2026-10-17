type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { id: string; name: string; images?: { url: string }[] };
  external_urls?: { spotify?: string };
  duration_ms?: number;
  explicit?: boolean;
};

type CatalogTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumkey: string;
  cover: string;
  duration: number | null;
  spotifyUrl: string | null;
  music: string | null;
  source: string;
  ex: boolean;
  lyricOffset: number;
};

type JamendoTrack = {
  id: string;
  name: string;
  artist_name: string;
  album_name?: string;
  album_image?: string;
  image?: string;
  audio?: string;
  duration?: number;
  audiodownload_allowed?: boolean;
};

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";
const MB_API = "https://musicbrainz.org/ws/2";
const JAMENDO_API = "https://api.jamendo.com/v3.0";

async function spotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) throw new Error(`Spotify token request failed: ${response.status}`);
  const json = await response.json();
  return json.access_token ?? null;
}

async function spotifySearch(token: string, query: string): Promise<SpotifyTrack[]> {
  const url = new URL(`${SPOTIFY_API}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "10");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    // Spotify may reject requests depending on the app's current access tier.
    console.warn("Spotify search unavailable:", response.status);
    return [];
  }
  const json = await response.json();
  return json.tracks?.items ?? [];
}

async function musicBrainzSearch(query: string): Promise<any[]> {
  const url = new URL(`${MB_API}/recording/`);
  url.searchParams.set("query", query);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "10");

  const response = await fetch(url, {
    headers: { "User-Agent": "DewnMusic/1.0 (catalog contact: configure-your-contact@example.com)" },
  });
  if (!response.ok) return [];
  const json = await response.json();
  return json.recordings ?? [];
}

function normalize(s: string): string {
  return s.toLocaleLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function trackKey(title: string, artist: string): string {
  return `${normalize(title)}::${normalize(artist)}`;
}

function spotifyToCatalog(track: SpotifyTrack): CatalogTrack {
  const albumkey = `spotify-${track.album.id}`;
  return {
    id: `spotify:${track.id}`,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    album: track.album.name,
    albumkey,
    cover: track.album.images?.[0]?.url ?? "",
    duration: typeof track.duration_ms === "number" ? Math.round(track.duration_ms / 1000) : null,
    spotifyUrl: track.external_urls?.spotify ?? null,
    // Metadata does not provide a playable full-track URL.
    music: null,
    source: "spotify",
    ex: Boolean(track.explicit),
    lyricOffset: 0,
  };
}

export async function searchJamendoTracks(title: string, artist = "") {
  const clientId = process.env.JAMENDO_CLIENT_ID;
  if (!clientId) {
    return [];
  }

  const url = new URL(`${JAMENDO_API}/tracks/`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "10");
  url.searchParams.set("audioformat", "mp32");
  url.searchParams.set("namesearch", `${title} ${artist}`.trim());
  url.searchParams.set("include", "musicinfo");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Jamendo request failed: ${response.status}`);
  const json = await response.json();

  return (json.results ?? []).map((track: JamendoTrack) => ({
    id: `jamendo:${track.id}`,
    title: track.name,
    artist: track.artist_name,
    album: track.album_name ?? "",
    cover: track.album_image ?? track.image ?? "",
    duration: track.duration ?? null,
    // This URL comes from Jamendo's API, not from Spotify/MusicBrainz.
    music: track.audio ?? null,
    source: "jamendo",
    playable: Boolean(track.audio),
  }));
}

export async function getCatalog() {
  const queries = [
    'genre:pop year:2024-2026',
    'genre:hip-hop year:2020-2026',
    'genre:alternative year:2018-2026',
    'genre:indie year:2020-2026',
  ];

  const token = await spotifyToken();
  const spotifyResults = token
    ? (await Promise.all(queries.map((q) => spotifySearch(token, q)))).flat()
    : [];

  const seen = new Set<string>();
  const spotifyTracks: CatalogTrack[] = [];
  for (const item of spotifyResults) {
    const track = spotifyToCatalog(item);
    const key = trackKey(track.title, track.artist);
    if (!seen.has(key)) {
      seen.add(key);
      spotifyTracks.push(track);
    }
  }

  // MusicBrainz is used as a metadata fallback/enrichment source. It does not
  // provide audio URLs, popularity rankings, or guaranteed album artwork.
  const mbQueries = ["recording:\"Blinding Lights\"", "recording:\"bad guy\"", "recording:\"Nights\""];
  const mbResults = (await Promise.all(mbQueries.map(musicBrainzSearch))).flat();
  const musicBrainz = mbResults.map((recording: any) => {
    const artist = recording["artist-credit"]?.map((x: any) => x.name ?? x.artist?.name).filter(Boolean).join(", ") ?? "Unknown artist";
    const release = recording.releases?.[0];
    const key = trackKey(recording.title ?? "", artist);
    if (seen.has(key)) return null;
    seen.add(key);
    return {
      id: `musicbrainz:${recording.id}`,
      title: recording.title ?? "Unknown title",
      artist,
      album: release?.title ?? "",
      albumkey: `mb-${release?.id ?? recording.id}`,
      cover: release?.id ? `https://coverartarchive.org/release/${release.id}/front-250` : "",
      duration: typeof recording.length === "number" ? Math.round(recording.length / 1000) : null,
      spotifyUrl: null,
      music: null,
      source: "musicbrainz",
      ex: false,
      lyricOffset: 0,
    } satisfies CatalogTrack;
  }).filter(Boolean) as CatalogTrack[];

  const tracks = [...spotifyTracks, ...musicBrainz].map((track) => ({
    ...track,
    // The existing player expects a string here, but empty means unavailable.
    music: track.music ?? "",
  }));

  const albumMap = new Map<string, any>();
  for (const track of tracks) {
    if (!albumMap.has(track.albumkey)) {
      albumMap.set(track.albumkey, {
        key: track.albumkey,
        title: track.album,
        cover: track.cover,
        colors: { b1: "#101010", b2: "#282828", b3: "#3a3a3a", b4: "#181818", b5: "#505050" },
      });
    }
  }

  return {
    tracks,
    albums: [...albumMap.values()],
    notice: "Spotify and MusicBrainz provide metadata, not playable full-track audio. Tracks without a licensed stream are metadata-only.",
  };
}
