'use client';

import { CircleCheck, Clock, Coins, type LucideIcon, RotateCcw, ShieldAlert, ShieldCheck, Undo2 } from 'lucide-react';
import { useLocale } from 'next-intl';

import { OrderActivityContent } from '@/components/admin/orders/OrderActivityContent';
import type { OrderActivityItem } from '@/lib/adminOrders';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import { cn } from '@/lib/utils';

const ICONS: Record<OrderActivityItem['kind'], LucideIcon> = {
    placed: Clock,
    paid: CircleCheck,
    disputeOpened: ShieldAlert,
    disputeClosed: ShieldCheck,
    refunded: RotateCcw,
    withdrawal: Undo2,
    commission: Coins,
};

const ICON_TONES: Partial<Record<OrderActivityItem['kind'], string>> = {
    paid: 'bg-status-good-wash text-status-good',
    disputeOpened: 'bg-status-danger-wash text-status-danger',
};

export function OrderActivityRow({ item, currency }: { item: OrderActivityItem; currency: string }) {
    const locale = useLocale();
    const Icon = ICONS[item.kind];

    return (
        <li className="group relative flex gap-3 pb-5 last:pb-0">
            {/* Rail */}
            <span aria-hidden className="absolute top-8 bottom-0 left-[13px] w-px bg-border group-last:hidden" />
            <span
                aria-hidden
                className={cn(
                    'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    ICON_TONES[item.kind] ?? 'bg-surface-muted text-ink-muted',
                )}
            >
                <Icon className="h-3.5 w-3.5" />
            </span>

            {/* Content, with the date beside it from sm up and underneath on phones */}
            <div className="min-w-0 flex-1 pt-1 sm:flex sm:items-start sm:gap-4">
                <div className="min-w-0 flex-1">
                    <OrderActivityContent item={item} currency={currency} />
                </div>
                <time dateTime={item.at} className="mt-1 block font-mono text-[11.5px] text-ink-faint tabular-nums sm:mt-0.5 sm:shrink-0">
                    {formatAdminDateTime(locale, item.at)}
                </time>
            </div>
        </li>
    );
}
