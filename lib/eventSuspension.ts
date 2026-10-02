import type { QueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { subscribeApiErrors } from '@/lib/api/client';
import { isEventSuspendedError } from '@/lib/api/errors';

// A request refused with 4015 means a StoryWall this host is in was suspended. Refetching the
// event details flips `suspended`, and SuspendedEventRouteGuard shows the suspended view.
// Only ['events', id]: billing, hosts and other ['events', id, …] queries would just 4015 again.
// Listens at the API client, like reopenGuidelinesGateOn4013. Returns the unsubscribe.
export function refreshEventOn4015(client: QueryClient): () => void {
    return subscribeApiErrors((error) => {
        if (isEventSuspendedError(error)) {
            void client.invalidateQueries({ queryKey: eventKeys.all, predicate: (query) => query.queryKey.length === 2 });
        }
    });
}
