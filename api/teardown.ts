import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scrapePage, synthesizeTeardown, normalizeUrl } from './_lib/teardown.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!firecrawlKey) return res.status(500).json({ error: 'FIRECRAWL_API_KEY is not set' });
  if (!openrouterKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set' });

  try {
    const { url } = (req.body ?? {}) as { url?: string };
    if (!url) throw new Error('Missing url');
    const normalized = normalizeUrl(url);

    const page = await scrapePage(firecrawlKey, normalized);
    const teardown = await synthesizeTeardown(openrouterKey, page.markdown, page.title);

    res.status(200).json({
      teardown,
      source: {
        url: page.sourceUrl ?? normalized,
        title: page.title,
        description: page.description,
        scrapedMarkdown: page.markdown,
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
