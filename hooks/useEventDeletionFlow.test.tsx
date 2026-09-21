import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEventDeletionFlow } from '@/hooks/useEventDeletionFlow';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES } from '@/lib/api/errors';

const mocks = vi.hoisted(() => ({
    deleteMutate: vi.fn(),
    invalidateQueries: vi.fn(),
    otpMutate: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
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

vi.mock('@/hooks/useEventDeletion', () => ({
    useRequestEventDeletionOtp: () => ({
        error: null,
        isPending: false,
        mutateAsync: mocks.otpMutate,
        reset: vi.fn(),
    }),
    useRequestEventDeletion: () => ({
        error: null,
        isPending: false,
        mutateAsync: mocks.deleteMutate,
        reset: vi.fn(),
    }),
}));

function apiError(errorCode: number, status = 400, retryAfterSeconds?: number) {
    return new ApiError(status, { errorCode, retryAfterSeconds });
}

function otpChange(value: string) {
    return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

describe('useEventDeletionFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.otpMutate.mockResolvedValue(undefined);
        mocks.deleteMutate.mockResolvedValue({});
    });

    it('requests a code before accepting the deletion confirmation', async () => {
        const { result } = renderHook(() => useEventDeletionFlow('event-1'));

        act(() => result.current.openConfirm());
        expect(result.current.step).toBe('send');

        await act(() => result.current.sendOtp());

        expect(mocks.otpMutate).toHaveBeenCalledOnce();
        expect(result.current.step).toBe('verify');
        expect(result.current.resendSeconds).toBe(60);
    });

    it('keeps the resend cooldown when the modal is closed and reopened', async () => {
        const { result } = renderHook(() => useEventDeletionFlow('event-1'));

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());
        act(() => result.current.closeConfirm());
        act(() => result.current.openConfirm());

        expect(result.current.step).toBe('verify');
        expect(result.current.resendSeconds).toBe(60);
    });

    it('submits only six digits and redirects after deletion', async () => {
        const { result } = renderHook(() => useEventDeletionFlow('event-1'));

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());
        act(() => result.current.handleOtpChange(otpChange('04a2817')));
        await act(() => result.current.confirmDelete());

        expect(result.current.otpCode).toBe('042817');
        expect(mocks.deleteMutate).toHaveBeenCalledWith({ otpCode: '042817' });
        expect(mocks.replace).toHaveBeenCalledWith('/home');
    });

    it('shows an inline error for an incorrect code', async () => {
        mocks.deleteMutate.mockRejectedValueOnce(apiError(ERROR_CODES.EVENT_DELETE_OTP_INVALID));
        const { result } = renderHook(() => useEventDeletionFlow('event-1'));

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());
        act(() => result.current.handleOtpChange(otpChange('123456')));
        await act(() => result.current.confirmDelete());

        expect(result.current.step).toBe('verify');
        expect(result.current.otpInvalid).toBe(true);
    });

    it.each([
        [ERROR_CODES.EVENT_DELETE_OTP_NOT_REQUESTED, 'errors.notRequested'],
        [ERROR_CODES.EVENT_DELETE_OTP_EXPIRED, 'errors.expired'],
        [ERROR_CODES.EVENT_DELETE_OTP_TOO_MANY_ATTEMPTS, 'errors.tooManyAttempts'],
    ])('returns to the send step for code error %s', async (errorCode, message) => {
        mocks.deleteMutate.mockRejectedValueOnce(apiError(errorCode));
        const { result } = renderHook(() => useEventDeletionFlow('event-1'));

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());
        act(() => result.current.handleOtpChange(otpChange('123456')));
        await act(() => result.current.confirmDelete());

        expect(result.current.step).toBe('send');
        expect(result.current.otpCode).toBe('');
        expect(result.current.deleteError).toBe(message);
    });

    it('honors Retry-After when requesting another code', async () => {
        mocks.otpMutate.mockRejectedValueOnce(apiError(ERROR_CODES.RATE_LIMITED, 429, 17));
        const { result } = renderHook(() => useEventDeletionFlow('event-1'));

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());

        expect(result.current.resendSeconds).toBe(17);
        expect(result.current.deleteError).toBe('genericError');
    });

    it('closes and refreshes when deletion is already pending', async () => {
        mocks.otpMutate.mockRejectedValueOnce(apiError(ERROR_CODES.EVENT_DELETE_ALREADY_PENDING, 409));
        const { result } = renderHook(() => useEventDeletionFlow('event-1'));

        act(() => result.current.openConfirm());
        await act(() => result.current.sendOtp());

        expect(result.current.confirmOpen).toBe(false);
        expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['events', 'event-1'] });
    });
});
