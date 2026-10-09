'use client';

import { EventAddonsSection } from '@/components/admin/events/EventAddonsSection';
import { EventDetailOverlays } from '@/components/admin/events/EventDetailOverlays';
import { EventHostsSection } from '@/components/admin/events/EventHostsSection';
import { EventModulesSection } from '@/components/admin/events/EventModulesSection';
import { EventPlanSection } from '@/components/admin/events/EventPlanSection';
import { EventRecordSection } from '@/components/admin/events/EventRecordSection';
import { EventRestrictionBanner } from '@/components/admin/events/EventRestrictionBanner';
import { EventSummaryHeader } from '@/components/admin/events/EventSummaryHeader';
import { EventUsageSection } from '@/components/admin/events/EventUsageSection';
import { useEventDetailOverlays } from '@/hooks/useEventDetailOverlays';
import type { AdminEventDetailDto } from '@/lib/api/types';

// What the event can do on the left (its limits, modules and add-ons, each editable in place);
// who and what it is on the right, always in the same place. A closed event is past managing,
// so it shows the same page with every action gone.
export function EventDetail({ event }: { event: AdminEventDetailDto }) {
    const overlays = useEventDetailOverlays();
    const editable = !event.suspension?.closedAt;

    return (
        <div className="max-w-6xl space-y-5">
            {/* Restriction */}
            {event.suspension && <EventRestrictionBanner suspension={event.suspension} onLiftAction={overlays.openLift} />}

            {/* Summary */}
            <EventSummaryHeader event={event} editable={editable} onSuspendAction={overlays.openSuspend} onCloseAction={overlays.openClose} />

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                {/* Entitlements */}
                <div className="space-y-5">
                    <EventUsageSection
                        usage={event.usage}
                        editable={editable}
                        onEditStorageAction={overlays.openStorage}
                        onEditMembersAction={overlays.openMembers}
                    />
                    <EventModulesSection
                        event={event}
                        editable={editable}
                        onGrantAction={overlays.openGrantModule}
                        onRevokeAction={overlays.openRevokeModule}
                    />
                    <EventAddonsSection addons={event.addons} editable={editable} onRemoveAction={overlays.openRemoveAddon} />
                </div>

                {/* Reference */}
                <div className="space-y-5">
                    <EventPlanSection plan={event.plan} editable={editable} onChangeAction={overlays.openPlan} />
                    <EventHostsSection hosts={event.hosts} />
                    <EventRecordSection event={event} />
                </div>
            </div>

            {/* Drawers and confirmations */}
            <EventDetailOverlays event={event} overlays={overlays} />
        </div>
    );
}
