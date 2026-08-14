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

export interface TeardownSource {
  url: string;
  title?: string;
  description?: string;
  scrapedMarkdown: string;
}

export interface TeardownResult {
  teardown: Teardown;
  source: TeardownSource;
}
