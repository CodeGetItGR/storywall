'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { EventTypeConvention } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { lowestEventTypePlanPrice } from '@/lib/planTiers';

// Returns a resolver for the "From {price}" label on the create-event type
// cards. null when the type has no priced public plan.
export function useEventTypeStartingPrice(): (eventTypeKey: EventTypeConvention) => string | null {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const { data } = useAppConfig();

    return (eventTypeKey) => {
        const price = data ? lowestEventTypePlanPrice(data.planTiers, eventTypeKey) : null;
        if (!price) return null;
        if (price.amountMinor === 0) return t('typeFree');
        return t('typeStartingPrice', { price: formatMoney(locale, price.amountMinor, price.currency) });
    };
}
