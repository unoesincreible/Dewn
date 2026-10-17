/*
 * Include this file AFTER your existing songs/albums data script and BEFORE index.js.
 * It exposes window.DewnCatalog.load(), and adapts API data to the player's format.
 */
(function () {
  async function load() {
    const response = await fetch("/api/catalog");
    if (!response.ok) throw new Error("Catalog API returned " + response.status);
    const payload = await response.json();
    if (!payload.success || !payload.data) throw new Error("Invalid catalog response");

    const data = payload.data;
    const albums = data.albums || [];
    const albumByKey = new Map(albums.map((album) => [album.key, album]));

    const songs = (data.tracks || []).map((track) => {
      const album = albumByKey.get(track.albumkey);
      return {
        title: track.title,
        artist: track.artist,
        album: track.album,
        albumkey: track.albumkey,
        music: track.music || "",
        ex: Boolean(track.ex),
        lyricOffset: Number(track.lyricOffset) || 0,
        spotifyUrl: track.spotifyUrl || null,
        source: track.source,
        duration: track.duration,
        cover: track.cover || album?.cover || "",
      };
    });

    return { songs, albums, notice: data.notice || "" };
  }

  window.DewnCatalog = { load };
})();
