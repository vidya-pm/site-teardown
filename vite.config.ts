import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { scrapePage, synthesizeTeardown, normalizeUrl } from './api/_lib/teardown.ts'

async function readBody(req: IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

/**
 * Dev-server-only proxy, mirroring api/teardown.ts. Keys are read from process.env (via
 * loadEnv below, NOT the VITE_ prefix) so they never get inlined into client-bundled code —
 * only this Node-side middleware ever sees them. The browser talks to same-origin
 * /api/teardown, nothing else.
 */
function teardownProxyPlugin(firecrawlKey: string | undefined, openrouterKey: string | undefined): Plugin {
  return {
    name: 'teardown-proxy',
    configureServer(server) {
      server.middlewares.use('/api/teardown', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
        if (!firecrawlKey) return sendJson(res, 500, { error: 'FIRECRAWL_API_KEY is not set in .env.local' });
        if (!openrouterKey) return sendJson(res, 500, { error: 'OPENROUTER_API_KEY is not set in .env.local' });

        try {
          const { url } = JSON.parse((await readBody(req)) || '{}') as { url?: string };
          if (!url) throw new Error('Missing url');
          const normalized = normalizeUrl(url);

          const page = await scrapePage(firecrawlKey, normalized);
          const teardown = await synthesizeTeardown(openrouterKey, page.markdown, page.title);

          sendJson(res, 200, {
            teardown,
            source: {
              url: page.sourceUrl ?? normalized,
              title: page.title,
              description: page.description,
              scrapedMarkdown: page.markdown,
            },
          });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error' });
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      teardownProxyPlugin(env.FIRECRAWL_API_KEY, env.OPENROUTER_API_KEY),
    ],
    server: {
      host: true,
    },
  };
})
