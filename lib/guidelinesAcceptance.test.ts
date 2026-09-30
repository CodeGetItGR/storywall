import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { reopenGuidelinesGateOn4013 } from '@/lib/guidelinesAcceptance';

function apiError(status: number, errorCode: number) {
    // A ProblemDetail-shaped body, so the constructor fills `problem` itself.
    return new ApiError(status, { errorCode });
}

describe('reopenGuidelinesGateOn4013', () => {
    it('refetches me on 4013 so the gate reopens', () => {
        const client = new QueryClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');

        reopenGuidelinesGateOn4013(apiError(403, 4013), client);

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    });

    it('ignores every other error', () => {
        const client = new QueryClient();
        const invalidate = vi.spyOn(client, 'invalidateQueries');

        reopenGuidelinesGateOn4013(apiError(403, 4001), client);
        reopenGuidelinesGateOn4013(new Error('network'), client);

        expect(invalidate).not.toHaveBeenCalled();
    });
});
