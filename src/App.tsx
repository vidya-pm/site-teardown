import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTeardown } from './lib/api';
import { buildReportMarkdown, downloadMarkdown, slugify } from './lib/markdown';
import type { TeardownResult } from './types';

const EXAMPLES = ['linear.app', 'stripe.com', 'notion.so'];

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TeardownResult | null>(null);

  async function runTeardown(target: string) {
    const trimmed = target.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchTeardown(trimmed);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <header className="mb-10 text-center">
          <div className="mb-3 text-4xl">🔎</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Site Teardown</h1>
          <p className="mt-2 text-sm text-slate-500">
            Paste any product page — get a structured teardown of its positioning, features, and messaging.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runTeardown(url);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com or example.com"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:shadow-md hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </form>

        {!result && !loading && !error && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setUrl(ex);
                  runTeardown(ex);
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-10 flex flex-col items-center gap-3 text-sm text-slate-500"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
              <p>Scraping the page and writing the teardown — usually 10–20s…</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <p className="font-semibold">Couldn't generate a teardown</p>
              <p className="mt-1 text-red-600">{error}</p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10"
            >
              <TeardownReport result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TeardownReport({ result }: { result: TeardownResult }) {
  const { teardown: t, source } = result;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-indigo-500 hover:underline"
          >
            {source.url} ↗
          </a>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{t.productName}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{t.tagline}</p>
        </div>
        <button
          onClick={() => downloadMarkdown(`${slugify(t.productName)}-teardown.md`, buildReportMarkdown(result))}
          className="flex-shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        >
          ⬇ Download .md
        </button>
      </div>

      <div className="space-y-6 px-6 py-6">
        <Section label="Summary">
          <p className="text-sm leading-relaxed text-slate-700">{t.summary}</p>
        </Section>

        <div className="grid gap-6 sm:grid-cols-2">
          <Section label="Value proposition">
            <p className="text-sm leading-relaxed text-slate-700">{t.valueProposition}</p>
          </Section>
          <Section label="Target audience">
            <p className="text-sm leading-relaxed text-slate-700">{t.targetAudience}</p>
          </Section>
        </div>

        <Section label="Key features">
          <ul className="flex flex-wrap gap-2">
            {t.keyFeatures.map((f, i) => (
              <li
                key={i}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
              >
                {f}
              </li>
            ))}
          </ul>
        </Section>

        <div className="grid gap-6 sm:grid-cols-2">
          <Section label="Pricing signals">
            <p className="text-sm leading-relaxed text-slate-700">{t.pricingSignals}</p>
          </Section>
          <Section label="Messaging tone">
            <p className="text-sm leading-relaxed text-slate-700">{t.messagingTone}</p>
          </Section>
        </div>

        <Section label="Primary CTA">
          <p className="inline-block rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
            {t.primaryCTA}
          </p>
        </Section>

        {t.notableClaims.length > 0 && (
          <Section label="Notable claims">
            <ul className="space-y-1.5">
              {t.notableClaims.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                  {c}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <details className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">
            View raw scraped content ({source.scrapedMarkdown.length.toLocaleString()} chars)
          </summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600">
            {source.scrapedMarkdown}
          </pre>
        </details>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {children}
    </div>
  );
}

export default App;
