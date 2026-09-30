import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

const mutateAsync = vi.fn();
vi.mock('@/hooks/useReports', () => ({
    useCreateReport: () => ({ mutateAsync, isPending: false }),
}));

import { useReportSubmission } from '@/hooks/useReportSubmission';

const messages = { failed: 'failed', ownContent: 'own', gone: 'gone', rateLimited: 'slow' };

function setup() {
    const onSuccessAction = vi.fn();
    const hook = renderHook(() =>
        useReportSubmission({ eventId: 'e1', targetId: 't1', targetType: 'STORY', onSuccessAction, messages }),
    );
    act(() => hook.result.current.setReason('SPAM'));
    return { hook, onSuccessAction };
}

describe('useReportSubmission', () => {
    beforeEach(() => {
        mutateAsync.mockReset();
    });

    it.each([
        [3038, 'own'],
        [2001, 'gone'],
        [3010, 'slow'],
        [9999, 'failed'],
    ])('maps error %s to its message', async (errorCode, expected) => {
        mutateAsync.mockRejectedValue(new ApiError(400, { errorCode }));
        const { hook, onSuccessAction } = setup();

        await act(() => hook.result.current.submit());

        expect(hook.result.current.error).toBe(expected);
        expect(onSuccessAction).not.toHaveBeenCalled();
    });

    it('closes on success', async () => {
        mutateAsync.mockResolvedValue({});
        const { hook, onSuccessAction } = setup();

        await act(() => hook.result.current.submit());

        expect(onSuccessAction).toHaveBeenCalled();
    });
});
