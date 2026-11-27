import { getTranslations } from 'next-intl/server';

import { WhyView } from '@/components/occasions/sections/why/WhyView';
import { whyViewProps } from '@/components/occasions/sections/why/whyViewProps';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

type WhySectionProps = {
    guestPhotos: 'marquee' | 'row';
    locale: Locale;
    media: OccasionPageMedia;
    occasion: Occasion;
    // The QR wedding page while it is live and the page links to it, else null.
    qrHref: string | null;
};

export async function WhySection({ guestPhotos, locale, media, occasion, qrHref }: WhySectionProps) {
    const [why, imageAlt] = await Promise.all([
        getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.why` }),
        getTranslations({ locale, namespace: 'ImageAlt' }),
    ]);
    return <WhyView {...whyViewProps({ imageAlt, layout: guestPhotos, media, qrHref, why })} />;
}
