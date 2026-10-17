import type { VercelRequest, VercelResponse } from "@vercel/node";
import { searchJamendoTracks } from "../src/lib/musicCatalog";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
  const artist = typeof req.query.artist === "string" ? req.query.artist.trim() : "";

  if (!title) return res.status(400).json({ error: "title is required" });

  try {
    const tracks = await searchJamendoTracks(title, artist);
    return res.status(200).json({ success: true, tracks });
  } catch (error) {
    console.error("Streaming lookup error:", error);
    return res.status(502).json({ error: "Could not find a playable stream." });
  }
}
