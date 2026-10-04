import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountDeletionFlow } from '@/hooks/useAccountDeletionFlow';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';

const mocks = vi.hoisted(() => ({
    post: vi.fn(),
    logout: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useMutation: ({ mutationFn }: { mutationFn: (input?: unknown) => Promise<unknown> }) => ({
        isPending: false,
        mutateAsync: mutationFn,
        reset: vi.fn(),
    }),
}));

vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post: mocks.post },
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => () => 'genericError',
}));

vi.mock('@/providers/AuthProvider', () => ({
    useAuth: () => ({ logout: mocks.logout }),
}));

function apiError(errorCode: number, status = 400, details?: unknown) {
    return new ApiError(status, { errorCode, details });
}

function otpChange(value: string) {
    return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

describe('useAccountDeletionFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.post.mockResolvedValue(undefined);
        mocks.logout.mockResolvedValue(undefined);
    });

    it('sends a code, confirms with it, then signs out to the login page', async () => {
        const { result } = renderHook(() => useAccountDeletionFlow());

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());
        expect(mocks.post).toHaveBeenCalledWith('/api/me/deletion-requests/otp');
        expect(result.current.step).toBe('verify');

        act(() => result.current.handleOtpChange(otpChange('04a2817')));
        await act(() => result.current.confirmDelete());

        expect(mocks.post).toHaveBeenLastCalledWith('/api/me/deletion-requests', { otpCode: '042817' });
        expect(mocks.logout).toHaveBeenCalledOnce();
        expect(mocks.replace).toHaveBeenCalledWith('/login?accountDeleted=1');
    });

    it('lists the hosted events that block deletion', async () => {
        mocks.post.mockRejectedValueOnce(
            apiError(ERROR_CODES.ACCOUNT_DELETE_HAS_HOSTED_EVENTS, 409, { events: [{ eventId: 'e-1', title: 'Our wedding' }] }),
        );
        const { result } = renderHook(() => useAccountDeletionFlow());

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());

        expect(result.current.step).toBe('send');
        expect(result.current.blockingEvents).toEqual([{ eventId: 'e-1', title: 'Our wedding' }]);
        expect(result.current.deleteError).toBeNull();
    });

    it('flags an incorrect code inline and stays signed in', async () => {
        const { result } = renderHook(() => useAccountDeletionFlow());
        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());
        mocks.post.mockRejectedValueOnce(apiError(ERROR_CODES.ACCOUNT_DELETE_OTP_INVALID));
        act(() => result.current.handleOtpChange(otpChange('123456')));
        await act(() => result.current.confirmDelete());

        expect(result.current.otpInvalid).toBe(true);
        expect(mocks.logout).not.toHaveBeenCalled();
    });

    it.each([
        [ERROR_CODES.ACCOUNT_DELETE_OTP_NOT_REQUESTED, 'errors.notRequested'],
        [ERROR_CODES.ACCOUNT_DELETE_OTP_EXPIRED, 'errors.expired'],
        [ERROR_CODES.ACCOUNT_DELETE_OTP_TOO_MANY_ATTEMPTS, 'errors.tooManyAttempts'],
    ])('returns to the send step for %s', async (code, message) => {
        const { result } = renderHook(() => useAccountDeletionFlow());
        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());
        mocks.post.mockRejectedValueOnce(apiError(code));
        act(() => result.current.handleOtpChange(otpChange('123456')));
        await act(() => result.current.confirmDelete());

        expect(result.current.step).toBe('send');
        expect(result.current.deleteError).toBe(message);
        expect(result.current.resendSeconds).toBe(0);
    });

    it('shows the server message for an admin', async () => {
        mocks.post.mockRejectedValueOnce(apiError(ERROR_CODES.ACCOUNT_DELETE_ADMIN, 403));
        const { result } = renderHook(() => useAccountDeletionFlow());
        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());

        expect(result.current.deleteError).toBe('genericError');
        expect(result.current.blockingEvents).toBeNull();
    });
});
