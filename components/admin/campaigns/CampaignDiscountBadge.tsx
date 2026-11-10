'use client';

import { useTranslations } from 'next-intl';

import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import type { CampaignDiscountViewDto } from '@/lib/api/types';

const PILL = 'inline-flex items-center rounded-full bg-status-neutral-wash px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap text-ink';

// "−50% until 30 Nov".
export function CampaignDiscountBadge({ discount }: { discount: CampaignDiscountViewDto }) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useCampaignFormat();

    return <span className={PILL}>{t('discountUntil', { percent: format.percent(discount.percent), date: format.shortDate(discount.endsAt) })}</span>;
}
