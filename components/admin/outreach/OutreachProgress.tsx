'use client';

import { OutreachProgressForm } from '@/components/admin/outreach/OutreachProgressForm';
import { OutreachTipCard } from '@/components/admin/outreach/OutreachTipCard';
import { useOutreachProgressForm } from '@/hooks/useOutreachProgressForm';
import type { OutreachProspectDto } from '@/lib/api/types';

// The tip with its next step, and the status form. The drawer keys this on updatedAt,
// so after any save the form shows what the server stored (e.g. its default follow-up date).
export function OutreachProgress({ prospect }: { prospect: OutreachProspectDto }) {
    const progress = useOutreachProgressForm(prospect);

    return (
        <>
            {/* Tip and next step */}
            <OutreachTipCard prospect={prospect} form={progress} />

            {/* Where it stands */}
            <OutreachProgressForm form={progress} />
        </>
    );
}
