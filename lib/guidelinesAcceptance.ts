import type { QueryClient } from '@tanstack/react-query';

import { meQueryKey } from '@/hooks/useMe';
import { subscribeApiErrors } from '@/lib/api/client';
import { isGuidelinesAcceptanceRequiredError, isTermsAcceptanceRequiredError } from '@/lib/api/errors';

// A request refused with 4013 (or 4020) means the guidelines (or the Terms of Use)
// changed, or were never accepted, during this session. Refetching /api/me flips
// guidelinesAcceptanceRequired (or termsAcceptanceRequired), and
// GuidelinesAcceptanceGate takes over.
// Listens at the API client, so writes made with api.* outside React Query
// count too. Call from the browser only; returns the unsubscribe.
export function reopenAcceptanceGate(client: QueryClient): () => void {
    return subscribeApiErrors((error) => {
        if (isGuidelinesAcceptanceRequiredError(error) || isTermsAcceptanceRequiredError(error)) {
            // exact: only /api/me, not every ['me', ...] query (e.g. the user's events).
            void client.invalidateQueries({ queryKey: meQueryKey, exact: true });
        }
    });
}
