import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCoHostManagement } from '@/hooks/useCoHostManagement';
import { ApiError } from '@/lib/api/client';
import type { EventHostResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ transfer: vi.fn(), remove: vi.fn(), gift: { data: null as { status: string } | null } }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.problem?.errorCode : 'unknown'}`,
}));
vi.mock('@/hooks/useEventHosts', () => ({
    useTransferPrimaryEventHost: () => ({ mutateAsync: mocks.transfer, isPending: false }),
    useDeleteEventHost: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));
vi.mock('@/hooks/useGift', () => ({ useEventGift: () => mocks.gift }));

const host = { id: 'host-2' } as EventHostResponseDto;

describe('useCoHostManagement', () => {
    beforeEach(() => {
        mocks.transfer.mockReset();
        mocks.remove.mockReset();
        mocks.gift = { data: null };
    });

    it('hides the transfer while a claimed gift waits for its handover', () => {
        mocks.gift = { data: { status: 'CLAIMED' } };
        expect(renderHook(() => useCoHostManagement('event-1')).result.current.canTransfer).toBe(false);

        mocks.gift = { data: { status: 'COMPLETED' } };
        expect(renderHook(() => useCoHostManagement('event-1')).result.current.canTransfer).toBe(true);
    });

    it('says a payment is in progress when the transfer meets an open checkout (5031)', async () => {
        mocks.transfer.mockRejectedValue(new ApiError(409, { errorCode: 5031 }));
        const { result } = renderHook(() => useCoHostManagement('event-1'));

        act(() => result.current.requestTransfer(host));
        await act(() => result.current.confirmTransfer());

        expect(result.current.error).toBe('hostTransferPaymentInProgress');
        expect(result.current.transferTarget).toBe(host);
    });

    it('uses the shared message for any other refusal', async () => {
        mocks.transfer.mockRejectedValue(new ApiError(409, { errorCode: 5081 }));
        const { result } = renderHook(() => useCoHostManagement('event-1'));

        act(() => result.current.requestTransfer(host));
        await act(() => result.current.confirmTransfer());

        expect(result.current.error).toBe('api-5081');
    });
});
