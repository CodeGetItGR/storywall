import { useTranslations } from 'next-intl';

import type { AdminOrderSummaryDto } from '@/lib/api/types';

// What sets an order apart from a plain paid one: no money taken, or a chargeback open.
export function OrderFlags({ order }: { order: Pick<AdminOrderSummaryDto, 'comp' | 'disputeOpen'> }) {
    const t = useTranslations('AdminPage.orders.flags');
    if (!order.comp && !order.disputeOpen) return null;

    return (
        <span className="inline-flex flex-wrap gap-1">
            {order.comp && <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{t('comp')}</span>}
            {order.disputeOpen && (
                <span className="rounded-full bg-status-danger-wash px-2 py-0.5 text-[11px] font-bold text-status-danger">{t('disputed')}</span>
            )}
        </span>
    );
}
