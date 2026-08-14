import type { TeardownResult } from '../types';

export function buildReportMarkdown({ teardown: t, source }: TeardownResult): string {
  const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

  return `# ${t.productName}

**${t.tagline}**

Source: [${source.url}](${source.url})

## Summary

${t.summary}

## Value proposition

${t.valueProposition}

## Target audience

${t.targetAudience}

## Key features

${bullets(t.keyFeatures)}

## Pricing signals

${t.pricingSignals}

## Messaging tone

${t.messagingTone}

## Primary CTA

${t.primaryCTA}

## Notable claims

${bullets(t.notableClaims)}

---

## Appendix: raw scraped content

<details>
<summary>Click to expand</summary>

${source.scrapedMarkdown}

</details>
`;
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'teardown';
}
