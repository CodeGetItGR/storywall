'use client';

import { InvitationsQrScreen } from '@/components/manage/invitations/InvitationsQrScreen';
import { InvitationsQrPageSkeleton } from '@/components/manage/ManageSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function InvitationsQrPage() {
    return (
        <EventRouteGate requireHost fallback={<InvitationsQrPageSkeleton />}>
            <InvitationsQrScreen />
        </EventRouteGate>
    );
}
