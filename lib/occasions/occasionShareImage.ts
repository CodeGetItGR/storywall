import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { findReadyOccasion } from '@/lib/occasions/occasions';
import { occasionOgImage } from '@/lib/og/ogImages';

// An occasion page's share image, served from a fixed URL (`<page>/share-image`) that its
// metadata can name. Next's opengraph-image.tsx convention gives dynamic routes a generated
// URL suffix and did not add it to these pages' head. Cached a day: the title only changes
// with a deploy.
export async function occasionShareImageResponse(locale: Locale, slug: string): Promise<Response> {
    const occasion = findReadyOccasion(locale, slug);
    if (!occasion) return new Response(null, { status: 404 });
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    const image = await occasionOgImage(t('h1'));
    image.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    return image;
}
