import { useAuth } from '@/hooks/useAuth';
import { useEventDetails } from '@/hooks/useEvent';
import { useEventContextLoading, useMyMemberships } from '@/providers/EventProvider';

export function useMyEventList() {
    const { user } = useAuth();
    const memberships = useMyMemberships();
    const isLoading = useEventContextLoading();
    const eventQueries = useEventDetails(memberships.map((member) => member.eventId));

    return {
        displayName: user?.displayName ?? null,
        email: user?.email ?? null,
        eventQueries,
        isLoading,
        memberships,
    };
}
