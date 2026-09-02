'use client';

import { BillingRefundPanel } from '@/components/manage/billing/BillingRefundPanel';
import { useEventRefundFlow } from '@/hooks/useEventRefundFlow';

export function EventRefundSection({ eventId }: { eventId: string }) {
    const refundFlow = useEventRefundFlow(eventId);

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <BillingRefundPanel panel={refundFlow} />
        </div>
    );
}
