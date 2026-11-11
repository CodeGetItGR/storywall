import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEmailCode } from '@/hooks/useEmailCode';
import { ApiError } from '@/lib/api/client';
import { readCodeSentAt, rememberCodeSentAt } from '@/lib/emailCode';

const api = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
const refetchMe = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { userId: 'u1', email: 'anna@example.com' } }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: refetchMe }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'generic' }));

beforeEach(() => {
    window.sessionStorage.clear();
    api.post.mockResolvedValue(undefined);
    api.put.mockResolvedValue(undefined);
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useEmailCode', () => {
    it('sends a first code when none went to this account in this tab', async () => {
        renderHook(() => useEmailCode());
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/auth/email-code'));
        expect(readCodeSentAt('u1')).not.toBeNull();
    });

    it('does not send another code right after sign-up sent one', () => {
        rememberCodeSentAt('u1', Date.now());
        const { result } = renderHook(() => useEmailCode());
        expect(api.post).not.toHaveBeenCalled();
        expect(result.current.secondsLeft).toBeGreaterThan(55);
    });

    it('verifies the code and refreshes the account', async () => {
        rememberCodeSentAt('u1', Date.now());
        const { result } = renderHook(() => useEmailCode());
        await act(() => result.current.verify('123456'));
        expect(api.post).toHaveBeenCalledWith('/api/auth/email-code/verify', { code: '123456' });
        expect(refetchMe).toHaveBeenCalled();
    });

    it('shows the wrong-code message and clears the boxes', async () => {
        rememberCodeSentAt('u1', Date.now());
        api.post.mockRejectedValueOnce(new ApiError(400, { errorCode: 3127 }));
        const { result } = renderHook(() => useEmailCode());
        act(() => result.current.setCode('123456'));
        await act(() => result.current.verify('123456'));
        expect(result.current.errorKey).toBe('wrong');
        expect(result.current.code).toBe('');
    });

    it('treats an already verified email as done', async () => {
        rememberCodeSentAt('u1', Date.now());
        api.post.mockRejectedValueOnce(new ApiError(409, { errorCode: 5227 }));
        const { result } = renderHook(() => useEmailCode());
        await act(() => result.current.verify('123456'));
        expect(refetchMe).toHaveBeenCalled();
        expect(result.current.errorKey).toBeNull();
    });

    it('starts only the countdown when the first send is rate limited', async () => {
        api.post.mockRejectedValueOnce(new ApiError(429, { errorCode: 1003 }));
        const { result } = renderHook(() => useEmailCode());
        await waitFor(() => expect(result.current.secondsLeft).toBeGreaterThan(0));
        expect(result.current.error).toBeNull();
    });
});
