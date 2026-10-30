'use client';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { OutreachAskRemove } from '@/components/admin/outreach/OutreachAskRemove';
import { OutreachColdEmail } from '@/components/admin/outreach/OutreachColdEmail';
import { OutreachNotes } from '@/components/admin/outreach/OutreachNotes';
import { OutreachProgress } from '@/components/admin/outreach/OutreachProgress';
import { OutreachReach } from '@/components/admin/outreach/OutreachReach';
import { OutreachRemove } from '@/components/admin/outreach/OutreachRemove';
import { OutreachWhy } from '@/components/admin/outreach/OutreachWhy';
import { useOutreachColdEmail } from '@/hooks/useOutreachColdEmail';
import type { OutreachProspectDto } from '@/lib/api/types';

// One business, top to bottom in the order the work happens.
export function OutreachDrawerContent({ prospect, onRemovedAction }: { prospect: OutreachProspectDto; onRemovedAction: () => void }) {
    const email = useOutreachColdEmail(prospect);
    const { role } = useAdminNavigation();

    return (
        <div className="space-y-7">
            {/* Tip, next step and status */}
            <OutreachProgress key={prospect.updatedAt} prospect={prospect} />

            {/* How to reach them */}
            <OutreachReach prospect={prospect} />

            {/* Cold email */}
            <OutreachColdEmail email={email} />

            {/* Why this business */}
            <OutreachWhy prospect={prospect} />

            {/* Notes and activity */}
            <OutreachNotes prospect={prospect} />

            {/* Remove: an admin removes, marketing asks an admin to */}
            {role === 'ADMIN' ? (
                <OutreachRemove prospectId={prospect.id} onRemovedAction={onRemovedAction} />
            ) : (
                <OutreachAskRemove key={prospect.id} prospectId={prospect.id} />
            )}
        </div>
    );
}
