import type { Metadata } from 'next';

import type { Locale } from '@/i18n/config';
import { type Occasion, occasionLanguageAlternates, occasionPath } from '@/lib/occasions/occasions';
import { buildIndexableMetadata, type PageMetadataCopy } from '@/lib/seo';

// Each occasion page serves its own share image (app/(landing)/[slug]/…/share-image).
export function buildOccasionMetadata(occasion: Occasion, locale: Locale, copy: PageMetadataCopy): Metadata {
    const path = occasionPath(occasion, locale);
    return buildIndexableMetadata({ locale, path, languages: occasionLanguageAlternates(occasion), imagePath: `${path}/share-image`, copy });
}
