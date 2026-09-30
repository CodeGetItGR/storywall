import { act, renderHook } from '@testing-library/react';
import type { SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGiftManagement } from '@/hooks/useGiftManagement';
import { ApiError } from '@/lib/api/client';
import type { GiftHandoverRequestDto, GiftHandoverResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    saves: [] as GiftHandoverRequestDto[],
    saveResult: (): Promise<unknown> => Promise.resolve({}),
    issues: 0,
    issueResult: (): Promise<unknown> => Promise.resolve({}),
}));

vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.problem?.errorCode : 'unknown'}`,
}));
vi.mock('@/hooks/useGift', () => ({
    useSaveGift: () => ({
        mutateAsync: ({ input }: { input: GiftHandoverRequestDto }) => {
            mocks.saves.push(input);
            return mocks.saveResult();
        },
        isPending: false,
    }),
    useIssueGiftCard: () => ({
        mutateAsync: () => {
            mocks.issues += 1;
            return mocks.issueResult();
        },
        isPending: false,
        data: undefined,
    }),
}));

function gift(overrides: Partial<GiftHandoverResponseDto> = {}): GiftHandoverResponseDto {
    return {
        status: 'NOT_ISSUED',
        recipientLabel: 'Anna',
        giverDisplayName: 'Maria',
        recipientEmail: null,
        token: null,
        cardIssuedAt: null,
        claimedByDisplayName: null,
        claimedAt: null,
        ownershipTransfersAt: null,
        ownershipTransferredAt: null,
        ...overrides,
    };
}

const submitEvent = { preventDefault: () => {} } as SubmitEvent<HTMLFormElement>;
const manage = { canManage: true, eventActive: true };

describe('useGiftManagement', () => {
    beforeEach(() => {
        mocks.saves = [];
        mocks.saveResult = () => Promise.resolve({});
        mocks.issues = 0;
        mocks.issueResult = () => Promise.resolve({});
    });

    it('opens the details with the saved gift and saves the edit', async () => {
        const { result } = renderHook(() => useGiftManagement('event-1', gift(), manage));

        act(() => result.current.openDetails());
        expect(result.current.details.value.recipientLabel).toBe('Anna');

        await act(() => result.current.submitDetails(submitEvent));
        expect(mocks.saves).toEqual([{ recipientLabel: 'Anna', giverDisplayName: 'Maria' }]);
        expect(result.current.detailsOpen).toBe(false);
    });

    it('keeps the details open with the error on a refused save', async () => {
        mocks.saveResult = () => Promise.reject(new ApiError(409, { errorCode: 5090 }));
        const { result } = renderHook(() => useGiftManagement('event-1', gift(), manage));

        act(() => result.current.openDetails());
        await act(() => result.current.submitDetails(submitEvent));

        expect(result.current.detailsOpen).toBe(true);
        expect(result.current.detailsError).toBe('api-5090');
    });

    it('issues a first card straight away and shows the PIN', async () => {
        const { result } = renderHook(() => useGiftManagement('event-1', gift(), manage));

        await act(async () => result.current.requestIssue());

        expect(mocks.issues).toBe(1);
        expect(result.current.pinOpen).toBe(true);
    });

    it('confirms before replacing a live card', async () => {
        const { result } = renderHook(() => useGiftManagement('event-1', gift({ status: 'ISSUED', token: 't' }), manage));

        act(() => result.current.requestIssue());
        expect(result.current.reissueOpen).toBe(true);
        expect(mocks.issues).toBe(0);

        await act(() => result.current.confirmReissue());
        expect(mocks.issues).toBe(1);
        expect(result.current.reissueOpen).toBe(false);
    });

    it('shows why a card could not be issued', async () => {
        mocks.issueResult = () => Promise.reject(new ApiError(409, { errorCode: 5092 }));
        const { result } = renderHook(() => useGiftManagement('event-1', gift(), manage));

        await act(async () => result.current.requestIssue());

        expect(result.current.issueError).toBe('api-5092');
        expect(result.current.pinOpen).toBe(false);
    });

    it('locks the actions once claimed, off an active event, or for a co-host', () => {
        const claimed = renderHook(() => useGiftManagement('event-1', gift({ status: 'CLAIMED' }), manage)).result.current;
        expect(claimed.canEdit).toBe(false);
        expect(claimed.canIssue).toBe(false);

        expect(renderHook(() => useGiftManagement('event-1', gift(), { canManage: true, eventActive: false })).result.current.canIssue).toBe(false);

        const coHost = renderHook(() => useGiftManagement('event-1', gift(), { canManage: false, eventActive: true })).result.current;
        expect(coHost.canEdit).toBe(false);
        expect(coHost.canIssue).toBe(false);
    });
});
