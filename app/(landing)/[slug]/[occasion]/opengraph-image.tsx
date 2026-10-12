import { getTranslations } from 'next-intl/server';

import { type Locale, locales } from '@/i18n/config';
import { findReadyOccasion } from '@/lib/occasions/occasions';
import { brandOgImage, occasionOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';

export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';
export const alt = 'StoryWall';

export default async function Image({ params }: { params: Promise<{ slug: string; occasion: string }> }) {
    const { slug, occasion: occasionSlug } = await params;
    const locale = locales.find((candidate) => candidate === slug) as Locale | undefined;
    const occasion = locale ? findReadyOccasion(locale, occasionSlug) : null;
    if (!locale || !occasion) return brandOgImage();
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    return occasionOgImage(t('h1'));
}
