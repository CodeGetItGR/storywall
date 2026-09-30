import type { QueryClient } from '@tanstack/react-query';

import { isGuidelinesAcceptanceRequiredError } from '@/lib/api/errors';

// Same key as hooks/useMe's meQueryKey. Repeated rather than imported because
// this module is also loaded server-side, and hooks/useMe is a client module.
const ME_QUERY_KEY = ['me'] as const;

// A write refused with 4013 means the guidelines changed (or were never
// accepted) during this session. Refetching /api/me flips
// guidelinesAcceptanceRequired, and GuidelinesAcceptanceGate takes over.
export function reopenGuidelinesGateOn4013(error: unknown, client: QueryClient): void {
    if (isGuidelinesAcceptanceRequiredError(error)) {
        void client.invalidateQueries({ queryKey: ME_QUERY_KEY });
    }
}
