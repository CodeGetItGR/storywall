import { useAuth } from '@/hooks/useAuth';
import { useEventGridItems } from '@/hooks/useEventGridItems';
import { useMe } from '@/hooks/useMe';
import { useMyEventList } from '@/hooks/useMyEventList';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

export type HomeEmptyStateKind = 'verifyEmail' | 'noEvents';

// The home page's events and which empty state, if any, replaces them.
export function useHomeContent() {
    const { user } = useAuth();
    useMe();
    const wizard = useCreateWizardEnabled();
    // Only a confirmed `false` blocks creation — `null` (not fetched yet)
    // must not flash the banner/disable the button for the common case of an
    // already-verified account. With the wizard on, an unverified account
    // verifies inside it, so nothing blocks the start.
    const canCreateEvent = wizard || user?.emailVerified !== false;
    const showCreateButton = wizard && user?.role !== 'ADMIN';

    const { eventQueries, isLoading, memberships } = useMyEventList();
    const items = useEventGridItems(memberships, eventQueries);
    const hasEvents = memberships.length > 0;

    const emptyState: HomeEmptyStateKind | null = isLoading || hasEvents ? null : canCreateEvent ? 'noEvents' : 'verifyEmail';
    // With no events the verify empty state already asks for the email, so the banner waits for the list to load.
    const showVerifyBanner = !canCreateEvent && !isLoading && hasEvents;

    return { canCreateEvent, emptyState, isLoading, items, showCreateButton, showVerifyBanner };
}
