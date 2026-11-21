import { getTranslations } from 'next-intl/server';

import { PrivateView } from '@/components/occasions/sections/private/PrivateView';
import { privateViewProps } from '@/components/occasions/sections/private/privateViewProps';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export async function PrivateSection({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const copy = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.private` });
    return <PrivateView {...privateViewProps(copy)} />;
}
