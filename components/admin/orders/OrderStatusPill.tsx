import { useTranslations } from 'next-intl';

import type { OrderStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<OrderStatus, string> = {
    PAID: 'bg-status-good-wash text-status-good',
    PENDING: 'bg-status-neutral-wash text-status-neutral',
    REFUNDED: 'bg-status-warn-wash text-status-warn',
    FAILED: 'bg-status-danger-wash text-status-danger',
    CANCELLED: 'bg-status-neutral-wash text-status-neutral',
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
    const t = useTranslations('AdminPage.orders.status');
    return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS_STYLES[status])}>{t(status)}</span>;
}
