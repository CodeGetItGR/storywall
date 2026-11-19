'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { PaidServiceResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// Under a plan without the invitation: the add-on that joins its payment (KAN-82).
export function PlanAddonLine({ service }: { service: PaidServiceResponseDto }) {
    const t = useTranslations('InvitationEditor');
    const locale = useLocale();

    return (
        <p className="text-sm font-medium text-ink-muted tabular-nums">
            {t('planAddOn', { name: service.name, price: formatMoney(locale, service.priceAmountMinor, service.priceCurrency) })}
        </p>
    );
}
