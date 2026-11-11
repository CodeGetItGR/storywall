import { useAuth } from '@/hooks/useAuth';
import { useEmailVerificationWatch } from '@/hooks/useEmailVerificationWatch';
import { useEventGridItems } from '@/hooks/useEventGridItems';
import { useMyEventList } from '@/hooks/useMyEventList';

export type HomeEmptyStateKind = 'verifyEmail' | 'noEvents';

// The home page's events and which empty state, if any, replaces them.
export function useHomeContent() {
    const { user } = useAuth();
    useEmailVerificationWatch();
    // Only a confirmed `false` blocks creation — `null` (not fetched yet)
    // must not flash the banner/disable the button for the common case of an
    // already-verified account.
    const canCreateEvent = user?.emailVerified !== false;

    const { eventQueries, isLoading, memberships } = useMyEventList();
    const items = useEventGridItems(memberships, eventQueries);
    const hasEvents = memberships.length > 0;

    const emptyState: HomeEmptyStateKind | null = isLoading || hasEvents ? null : canCreateEvent ? 'noEvents' : 'verifyEmail';
    // With no events the verify empty state already asks for the email, so the banner waits for the list to load.
    const showVerifyBanner = !canCreateEvent && !isLoading && hasEvents;

    return { canCreateEvent, emptyState, isLoading, items, showVerifyBanner };
}
