import { getTranslations } from 'next-intl/server';

import { defaultLocale } from '@/i18n/config';
import { findReadyOccasion } from '@/lib/occasions/occasions';
import { brandOgImage, occasionOgImage } from '@/lib/og/ogImages';
import { OG_IMAGE_SIZE } from '@/lib/seo';

export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';
export const alt = 'StoryWall';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const occasion = findReadyOccasion(defaultLocale, slug);
    if (!occasion) return brandOgImage();
    const t = await getTranslations({ locale: defaultLocale, namespace: `OccasionPages.${occasion.eventType}.hero` });
    return occasionOgImage(t('h1'));
}
