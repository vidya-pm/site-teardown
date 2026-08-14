# Site Teardown 🔎

Paste any product page — get back a structured teardown of its positioning, features,
pricing signals, and messaging, grounded entirely in what's actually on the page.

**Live**: https://site-teardown.vercel.app

## How it works

1. You give it a URL.
2. [Firecrawl](https://firecrawl.dev) scrapes the page and returns clean markdown.
3. That markdown is sent to an LLM via [OpenRouter](https://openrouter.ai), which is
   instructed to extract a structured teardown **only from what's on the page** — no
   invented features, pricing, or claims. Anything not stated is reported as such rather
   than guessed.
4. The result renders as a report: summary, value proposition, target audience, key
   features, pricing signals, messaging tone, primary CTA, and notable claims/stats —
   plus the raw scraped content for reference. Downloadable as a `.md` file.

## Stack

- React 19 + TypeScript + Vite, Tailwind CSS, Framer Motion for the report transitions
- Vercel serverless function (`api/teardown.ts`) proxies Firecrawl + OpenRouter so API
  keys never reach the browser
- Model: `openai/gpt-oss-20b:free` via OpenRouter, with retry/backoff on rate limits

