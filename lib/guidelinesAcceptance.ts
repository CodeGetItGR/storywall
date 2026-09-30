import type { QueryClient } from '@tanstack/react-query';

import { meQueryKey } from '@/hooks/useMe';
import { subscribeApiErrors } from '@/lib/api/client';
import { isGuidelinesAcceptanceRequiredError } from '@/lib/api/errors';

// A request refused with 4013 means the guidelines changed (or were never
// accepted) during this session. Refetching /api/me flips
// guidelinesAcceptanceRequired, and GuidelinesAcceptanceGate takes over.
// Listens at the API client, so writes made with api.* outside React Query
// count too. Call from the browser only; returns the unsubscribe.
export function reopenGuidelinesGateOn4013(client: QueryClient): () => void {
    return subscribeApiErrors((error) => {
        if (isGuidelinesAcceptanceRequiredError(error)) {
            // exact: only /api/me, not every ['me', ...] query (e.g. the user's events).
            void client.invalidateQueries({ queryKey: meQueryKey, exact: true });
        }
    });
}
