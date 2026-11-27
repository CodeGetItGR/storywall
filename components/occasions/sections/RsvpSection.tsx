import { getTranslations } from 'next-intl/server';

import { RsvpView } from '@/components/occasions/sections/rsvp/RsvpView';
import { rsvpViewProps } from '@/components/occasions/sections/rsvp/rsvpViewProps';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';
import type { OccasionPageMedia } from '@/lib/occasions/pageMedia';

export async function RsvpSection({ locale, media, occasion }: { locale: Locale; media: OccasionPageMedia; occasion: Occasion }) {
    const rsvp = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.rsvp` });
    return <RsvpView {...rsvpViewProps(rsvp, media.rsvpPictures[locale])} />;
}
