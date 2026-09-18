'use client';

import { WithdrawalPanel } from '@/components/manage/billing/WithdrawalPanel';
import { useEventWithdrawalFlow } from '@/hooks/useEventWithdrawalFlow';

export function EventWithdrawalSection({ eventId }: { eventId: string }) {
    const withdrawalFlow = useEventWithdrawalFlow(eventId);

    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <WithdrawalPanel panel={withdrawalFlow} />
        </div>
    );
}
