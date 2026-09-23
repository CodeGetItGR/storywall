'use client';

import { InvitationsQrScreen } from '@/components/manage/invitations/InvitationsQrScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function InvitationsQrPage() {
    return (
        <EventRouteGate requireHost>
            <InvitationsQrScreen />
        </EventRouteGate>
    );
}
