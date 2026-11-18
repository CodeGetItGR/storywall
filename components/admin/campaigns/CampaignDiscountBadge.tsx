'use client';

import { useTranslations } from 'next-intl';

import { useCampaignFormat } from '@/hooks/useCampaignFormat';
import type { CampaignDiscountViewDto } from '@/lib/api/types';

const PILL = 'inline-flex items-center rounded-full bg-status-neutral-wash px-2.5 py-1 font-mono text-[11px] font-bold whitespace-nowrap text-ink';

// "−50% until 30 Jun" on a list row; with `withDates`, "−50% on all plans · 1–30 Jun" in a campaign's
// header. A stopped discount shows nothing.
export function CampaignDiscountBadge({ discount, withDates = false }: { discount: CampaignDiscountViewDto; withDates?: boolean }) {
    const t = useTranslations('AdminPage.campaigns');
    const format = useCampaignFormat();
    if (discount.status === 'OFF') return null;
    const percent = format.percent(discount.percent);
    const text = withDates
        ? t('discountDates', { percent, dates: format.dates(discount.startsAt, discount.endsAt) })
        : t('discountUntil', { percent, date: format.shortDate(discount.endsAt) });

    return <span className={PILL}>{text}</span>;
}
