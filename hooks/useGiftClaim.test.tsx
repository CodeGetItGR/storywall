import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGiftClaim } from '@/hooks/useGiftClaim';
import { ApiError } from '@/lib/api/client';
import type { GiftClaimPreviewDto, GiftClaimRequestDto, GiftClaimResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    auth: { isAuthenticated: true, isBootstrapping: false, user: { isGuestAccount: false, emailVerified: true } as Record<string, unknown> | null },
    preview: { data: undefined as GiftClaimPreviewDto | undefined, error: null as unknown, isLoading: false },
    calls: [] as GiftClaimRequestDto[],
    result: (): Promise<GiftClaimResponseDto> => Promise.resolve({ status: 'COMPLETED', ownershipTransfersAt: null }),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: unknown) => `api-${error instanceof ApiError ? error.problem?.errorCode : 'unknown'}`,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({}) }));
vi.mock('@/hooks/useGift', () => ({
    useGiftClaimPreview: () => mocks.preview,
    useClaimGift: () => ({
        mutateAsync: (input: GiftClaimRequestDto) => {
            mocks.calls.push(input);
            return mocks.result();
        },
        isPending: false,
    }),
}));

function preview(overrides: Partial<GiftClaimPreviewDto> = {}): GiftClaimPreviewDto {
    return {
        eventTitle: 'Our wedding',
        eventSubtitle: null,
        coverMedia: null,
        giverDisplayName: 'Maria',
        recipientLabel: 'Anna',
        emailBound: true,
        state: 'CLAIMABLE',
        ...overrides,
    };
}

const submitEvent = { preventDefault: () => {} } as SubmitEvent<HTMLFormElement>;
const typed = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;
const refuse = (error: ApiError) => () => Promise.reject(error);

describe('useGiftClaim', () => {
    beforeEach(() => {
        mocks.auth = { isAuthenticated: true, isBootstrapping: false, user: { isGuestAccount: false, emailVerified: true } };
        mocks.preview = { data: preview(), error: null, isLoading: false };
        mocks.calls = [];
        mocks.result = () => Promise.resolve({ status: 'COMPLETED', ownershipTransfersAt: null });
    });

    it('claims without a PIN when an email is bound', async () => {
        const { result } = renderHook(() => useGiftClaim('tok'));
        expect(result.current.showPin).toBe(false);

        await act(() => result.current.submit(submitEvent));

        expect(mocks.calls).toEqual([{}]);
        expect(result.current.outcome).toEqual({ status: 'COMPLETED', ownershipTransfersAt: null });
    });

    it('asks for the PIN up front when no email is bound, and keeps digits only', async () => {
        mocks.preview.data = preview({ emailBound: false });
        const { result } = renderHook(() => useGiftClaim('tok'));
        expect(result.current.showPin).toBe(true);
        expect(result.current.canSubmit).toBe(false);

        act(() => result.current.handlePinChange(typed('12a34567')));
        expect(result.current.pin).toBe('123456');

        await act(() => result.current.submit(submitEvent));
        expect(mocks.calls).toEqual([{ pin: '123456' }]);
    });

    it('shows the PIN field with the tries left after a wrong PIN (3036)', async () => {
        mocks.preview.data = preview({ emailBound: false });
        mocks.result = refuse(new ApiError(400, { errorCode: 3036, details: { attemptsLeft: 2 } }));
        const { result } = renderHook(() => useGiftClaim('tok'));

        act(() => result.current.handlePinChange(typed('111111')));
        await act(() => result.current.submit(submitEvent));

        expect(result.current.attemptsLeft).toBe(2);
        expect(result.current.error).toBe('wrongPin');
        expect(result.current.pin).toBe('');
    });

    it('asks for the PIN when the email did not match', async () => {
        mocks.result = refuse(new ApiError(400, { errorCode: 3036, details: { attemptsLeft: 5 } }));
        const { result } = renderHook(() => useGiftClaim('tok'));

        await act(() => result.current.submit(submitEvent));

        expect(result.current.showPin).toBe(true);
        expect(result.current.error).toBe('pinNeeded');
    });

    it('blocks the page once the card locks', async () => {
        mocks.preview.data = preview({ emailBound: false });
        mocks.result = refuse(new ApiError(400, { errorCode: 3036, details: { attemptsLeft: 0 } }));
        const { result } = renderHook(() => useGiftClaim('tok'));

        act(() => result.current.handlePinChange(typed('111111')));
        await act(() => result.current.submit(submitEvent));

        expect(result.current.block).toBe('locked');
    });

    it('asks to retry when a payment is in progress (5031)', async () => {
        mocks.result = refuse(new ApiError(409, { errorCode: 5031 }));
        const { result } = renderHook(() => useGiftClaim('tok'));

        await act(() => result.current.submit(submitEvent));

        expect(result.current.error).toBe('hostTransferPaymentInProgress');
    });

    it('shows the shared message for other refusals', async () => {
        mocks.result = refuse(new ApiError(403, { errorCode: 4009 }));
        const { result } = renderHook(() => useGiftClaim('tok'));

        await act(() => result.current.submit(submitEvent));

        expect(result.current.error).toBe('api-4009');
    });

    it('blocks from the preview state', () => {
        mocks.preview.data = preview({ state: 'ALREADY_CLAIMED' });
        expect(renderHook(() => useGiftClaim('tok')).result.current.block).toBe('claimed');

        mocks.preview = { data: undefined, error: new ApiError(404, {}), isLoading: false };
        expect(renderHook(() => useGiftClaim('tok')).result.current.block).toBe('invalid');
    });

    it('flags guest and unconfirmed accounts', () => {
        mocks.auth.user = { isGuestAccount: true, emailVerified: true };
        expect(renderHook(() => useGiftClaim('tok')).result.current.accountIssue).toBe('guest');

        mocks.auth.user = { isGuestAccount: false, emailVerified: false };
        expect(renderHook(() => useGiftClaim('tok')).result.current.accountIssue).toBe('unverified');
    });

    it('sends signed-out visitors back to the card after sign-in', () => {
        mocks.auth = { isAuthenticated: false, isBootstrapping: false, user: null };
        const { result } = renderHook(() => useGiftClaim('tok'));

        expect(result.current.accountIssue).toBeNull();
        expect(result.current.loginHref).toBe(`/login?next=${encodeURIComponent('/gift/tok')}`);
    });
});
