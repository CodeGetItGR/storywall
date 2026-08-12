import { useAuth } from '@/hooks/useAuth';
import { useEventDetails } from '@/hooks/useEvent';
import { useEventContextLoading, useMyMemberships } from '@/providers/EventProvider';

export function useProfilePageData() {
    const { user } = useAuth();
    const memberships = useMyMemberships();
    const isLoading = useEventContextLoading();
    const eventQueries = useEventDetails(memberships.map((member) => member.eventId));

    return {
        email: user?.email ?? null,
        eventQueries,
        isEmpty: memberships.length === 0,
        isLoading,
        memberships,
    };
}
