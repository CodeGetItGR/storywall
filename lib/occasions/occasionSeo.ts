import type { Metadata } from 'next';

import type { Locale } from '@/i18n/config';
import { type Occasion, occasionLanguageAlternates, occasionPath } from '@/lib/occasions/occasions';
import { buildIndexableMetadata, type PageMetadataCopy } from '@/lib/seo';

// Each occasion page has its own share image next to it (opengraph-image.tsx).
export function buildOccasionMetadata(occasion: Occasion, locale: Locale, copy: PageMetadataCopy): Metadata {
    const path = occasionPath(occasion, locale);
    return buildIndexableMetadata(locale, path, occasionLanguageAlternates(occasion), `${path}/opengraph-image`, copy);
}
