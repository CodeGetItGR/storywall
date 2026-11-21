import { getTranslations } from 'next-intl/server';

import { FeaturesView } from '@/components/occasions/sections/features/FeaturesView';
import { featuresViewProps } from '@/components/occasions/sections/features/featuresViewProps';
import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';

export async function FeaturesSection({ featureKeys, locale, occasion }: { featureKeys: string[]; locale: Locale; occasion: Occasion }) {
    const [page, common] = await Promise.all([
        getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` }),
        getTranslations({ locale, namespace: 'OccasionPages.common' }),
    ]);
    return <FeaturesView {...featuresViewProps({ common, featureKeys, page })} />;
}
