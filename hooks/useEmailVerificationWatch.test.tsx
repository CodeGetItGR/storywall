import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMAIL_VERIFICATION_CHECK_MS, useEmailVerificationWatch } from '@/hooks/useEmailVerificationWatch';
import { rememberPendingCreateEventPath } from '@/lib/pendingCreateEvent';

const mocks = vi.hoisted(() => ({
    emailVerified: false as boolean | null,
    refetch: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { emailVerified: mocks.emailVerified } }) }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ refetch: mocks.refetch }) }));

beforeEach(() => {
    vi.useFakeTimers();
    mocks.emailVerified = false;
    mocks.refetch.mockClear();
    mocks.replace.mockClear();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
});

describe('useEmailVerificationWatch', () => {
    it('asks again on a timer and when the tab comes back, while unconfirmed', () => {
        renderHook(() => useEmailVerificationWatch());

        vi.advanceTimersByTime(EMAIL_VERIFICATION_CHECK_MS);
        expect(mocks.refetch).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new Event('focus'));
        expect(mocks.refetch).toHaveBeenCalledTimes(2);
    });

    it('does not ask while the tab is hidden', () => {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        renderHook(() => useEmailVerificationWatch());

        vi.advanceTimersByTime(EMAIL_VERIFICATION_CHECK_MS);

        expect(mocks.refetch).not.toHaveBeenCalled();
    });

    it('never asks for an account already confirmed, or not known yet', () => {
        for (const emailVerified of [true, null]) {
            mocks.emailVerified = emailVerified;
            const { unmount } = renderHook(() => useEmailVerificationWatch());
            vi.advanceTimersByTime(EMAIL_VERIFICATION_CHECK_MS);
            unmount();
        }

        expect(mocks.refetch).not.toHaveBeenCalled();
    });

    it('stops asking once confirmed', () => {
        const { rerender } = renderHook(() => useEmailVerificationWatch());
        mocks.emailVerified = true;
        rerender();

        vi.advanceTimersByTime(EMAIL_VERIFICATION_CHECK_MS * 3);

        expect(mocks.refetch).not.toHaveBeenCalled();
    });

    it('goes back to the create form they were stopped on once confirmed', () => {
        rememberPendingCreateEventPath('/events/new?plan=PLUS');
        const { rerender } = renderHook(() => useEmailVerificationWatch());
        expect(mocks.replace).not.toHaveBeenCalled();

        mocks.emailVerified = true;
        rerender();

        expect(mocks.replace).toHaveBeenCalledWith('/events/new?plan=PLUS');
    });

    it('stays on the page when no create form is waiting', () => {
        const { rerender } = renderHook(() => useEmailVerificationWatch());
        mocks.emailVerified = true;
        rerender();

        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('does not move an account that was already confirmed when the page opened', () => {
        rememberPendingCreateEventPath('/events/new?plan=PLUS');
        mocks.emailVerified = true;
        renderHook(() => useEmailVerificationWatch());

        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
