'use client';

import { useCampaignCountdown } from '@/hooks/useCampaignCountdown';

// Screen readers get the end date once instead of a clock that changes every second.
export function CampaignCountdown({ endsAt }: { endsAt: string }) {
    const { visible, endsIn, endsOn } = useCampaignCountdown(endsAt);
    if (!visible) return null;

    return (
        <>
            <span aria-hidden="true" className="whitespace-nowrap tabular-nums">
                {endsIn}
            </span>
            <span className="sr-only">{endsOn}</span>
        </>
    );
}
