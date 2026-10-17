import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCatalog } from "../src/lib/musicCatalog";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CATALOG_ALLOWED_ORIGIN || "*");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = await getCatalog();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Catalog API error:", error);
    return res.status(502).json({ error: "Could not load music catalog." });
  }
}
