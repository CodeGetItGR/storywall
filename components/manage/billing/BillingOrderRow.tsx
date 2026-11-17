import { ReceiptText } from 'lucide-react';

import { OrderWithdrawButton } from '@/components/manage/billing/OrderWithdrawButton';
import type { BillingOrderRowData } from '@/hooks/useBillingOrderRows';
import type { OrderSummaryDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function statusClassName(status: OrderSummaryDto['status']) {
    return cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        status === 'PAID' && 'bg-emerald-50 text-emerald-700',
        status === 'PENDING' && 'bg-amber-50 text-amber-700',
        status === 'FAILED' && 'bg-red-50 text-red-700',
        status === 'CANCELLED' && 'bg-surface-muted text-ink-muted',
        status === 'REFUNDED' && 'bg-sky-50 text-sky-700',
    );
}

// One order: what it was, its status, when, how much; what it covers and, inside the window, withdraw.
export function BillingOrderRow({ row, onWithdrawAction }: { row: BillingOrderRowData; onWithdrawAction?: (order: OrderSummaryDto) => void }) {
    return (
        <li className="flex gap-3 border-t border-border py-3 first:border-t-0" title={row.order.id}>
            {/* Icon */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-surface-muted text-primary-dark">
                <ReceiptText className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
                {/* Summary */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-[15px] font-semibold text-ink">{row.kindLabel}</p>
                            <span className={statusClassName(row.order.status)}>{row.statusLabel}</span>
                        </div>
                        <p className="text-[13px] text-ink-muted">{row.dateLabel}</p>
                    </div>
                    <p className="shrink-0 text-right text-[15px] font-bold text-ink tabular-nums">
                        {row.amountLabel}
                        {row.addonLabel && <span className="block text-[10px] font-normal text-ink-muted">{row.addonLabel}</span>}
                    </p>
                </div>

                {/* Coverage */}
                {row.coverageLabel && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{row.coverageLabel}</p>}

                {/* Withdraw */}
                {row.canWithdraw && onWithdrawAction && <OrderWithdrawButton order={row.order} onWithdrawAction={onWithdrawAction} />}
            </div>
        </li>
    );
}
