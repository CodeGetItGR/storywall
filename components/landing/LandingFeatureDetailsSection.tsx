import { getLocale } from 'next-intl/server';

import { LandingFeatureDetails } from '@/components/landing/LandingFeatureDetails';
import type { Locale } from '@/i18n/config';
import { getQrWeddingPath } from '@/i18n/publicLocale';
import { loadLiveOccasions } from '@/lib/occasions/liveOccasions.server';
import { occasionPath } from '@/lib/occasions/occasions';
import { loadQrWeddingPageLive } from '@/lib/qrWeddingPage.server';

// The feature cards, with the invitation card linking to the wedding page and the QR card to the
// QR page, each while that page is live. In the cards' order; null for a card without a link.
export async function LandingFeatureDetailsSection() {
    const locale = (await getLocale()) as Locale;
    const [occasions, qrPageLive] = await Promise.all([loadLiveOccasions(), loadQrWeddingPageLive()]);
    const wedding = occasions.find((occasion) => occasion.eventType === 'WEDDING');
    const links = [wedding ? occasionPath(wedding, locale) : null, qrPageLive ? getQrWeddingPath(locale) : null];

    return <LandingFeatureDetails links={links} />;
}
