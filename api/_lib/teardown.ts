/**
 * Shared logic for /api/teardown (Vercel serverless, prod) and the vite.config.ts dev
 * middleware (local `npm run dev`). Two callers, one copy each on purpose — this file is
 * bundled independently by Vercel while vite.config.ts is built by the project's own
 * Node tsconfig, so importing across that boundary isn't worth the friction. Keep both
 * copies in sync if you change the prompt or the request shapes.
 */

export interface ScrapedPage {
  markdown: string;
  title?: string;
  description?: string;
  sourceUrl?: string;
}

export interface Teardown {
  productName: string;
  tagline: string;
  valueProposition: string;
  targetAudience: string;
  keyFeatures: string[];
  pricingSignals: string;
  messagingTone: string;
  primaryCTA: string;
  notableClaims: string[];
  summary: string;
}

const MAX_MARKDOWN_CHARS = 12_000;

export const TEARDOWN_SYSTEM = `You are a sharp product analyst writing a teardown for a product manager. Given the \
scraped markdown content of a product or company's webpage, produce a structured teardown grounded ONLY in the \
provided content. Do not invent facts, features, pricing, or claims that are not present in the text. If \
information for a field genuinely isn't present on the page, say "Not stated on this page" for that field rather \
than guessing.

Respond with ONLY a JSON object of exactly this shape, no markdown fences, no commentary before or after:
{
  "productName": "string — the product or company name",
  "tagline": "string — their own tagline/headline if present, else a one-line description you write from the content",
  "valueProposition": "string — 2-3 sentences on what problem this solves and for whom",
  "targetAudience": "string — who this is built for, based on the page's own language",
  "keyFeatures": ["3 to 8 short phrases, each a distinct feature or capability mentioned"],
  "pricingSignals": "string — any pricing info found (plans, free tier, 'contact us', etc), or 'Not stated on this page'",
  "messagingTone": "string — e.g. 'Technical and developer-focused' or 'Reassuring and consumer-friendly'",
  "primaryCTA": "string — the main call-to-action button/link text on the page",
  "notableClaims": ["up to 5 stats, social proof, or claims made on the page, e.g. '10,000+ customers'"],
  "summary": "string — 3-4 sentence overall teardown synthesizing the above"
}`;

export async function scrapePage(apiKey: string, url: string): Promise<ScrapedPage> {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!res.ok) throw new Error(`Firecrawl error ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    data?: {
      markdown?: string;
      metadata?: { title?: string; description?: string; sourceURL?: string };
    };
  };
  if (!json.success || !json.data?.markdown) {
    throw new Error(json.error || 'Firecrawl returned no content for this URL');
  }

  return {
    markdown: json.data.markdown,
    title: json.data.metadata?.title,
    description: json.data.metadata?.description,
    sourceUrl: json.data.metadata?.sourceURL,
  };
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Model did not return valid JSON');
    }
    return JSON.parse(text.slice(start, end + 1));
  }
}

const MAX_RETRIES = 3;
const MAX_RETRY_WAIT_SECONDS = 15;

export async function synthesizeTeardown(
  apiKey: string,
  markdown: string,
  pageTitle: string | undefined
): Promise<Teardown> {
  const truncated = markdown.slice(0, MAX_MARKDOWN_CHARS);
  const body = JSON.stringify({
    model: 'openai/gpt-oss-20b:free',
    messages: [
      { role: 'system', content: TEARDOWN_SYSTEM },
      { role: 'user', content: `Page title: ${pageTitle ?? '(unknown)'}\n\nScraped content:\n\n${truncated}` },
    ],
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body,
    });

    // Free-tier models sit behind a shared pool and get transiently rate-limited under load —
    // retry a few times (honoring the provider's own Retry-After hint) before giving up.
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const errText = await res.text();
      let retryAfter = 5;
      try {
        retryAfter = JSON.parse(errText)?.error?.metadata?.retry_after_seconds ?? 5;
      } catch {
        // ignore parse failure, use default
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, MAX_RETRY_WAIT_SECONDS) * 1000));
      continue;
    }

    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenRouter');

    return extractJson(content) as Teardown;
  }

  throw new Error('OpenRouter is rate-limited right now — please try again in a minute.');
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
