import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVerifyEmail } from '@/hooks/useVerifyEmail';
import { rememberPendingCreateEventPath } from '@/lib/pendingCreateEvent';

const apiPost = vi.fn();
vi.mock('@/lib/api/client', () => ({
    api: { post: (...a: unknown[]) => apiPost(...a) },
    ApiError: class ApiError extends Error {},
}));

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('token=abc') }));

function wrapper({ children }: { children: React.ReactNode }) {
    return (
        <NextIntlClientProvider locale="en" messages={{}}>
            {children}
        </NextIntlClientProvider>
    );
}

beforeEach(() => {
    apiPost.mockReset();
    window.localStorage.clear();
});

describe('useVerifyEmail', () => {
    it('sends a single-use link once, even when the effect runs twice', async () => {
        // A second submit of the same token is answered "already used".
        apiPost.mockResolvedValueOnce(undefined).mockRejectedValue(new Error('link already used'));

        // Strict mode runs the effect twice, like a remount would.
        const { result } = renderHook(() => useVerifyEmail(), { wrapper, reactStrictMode: true });

        await waitFor(() => expect(result.current.state).toBe('verified'));
        expect(apiPost).toHaveBeenCalledTimes(1);
    });

    it('signs in to the plain login page with no create form to go back to', async () => {
        apiPost.mockResolvedValue(undefined);
        const { result } = renderHook(() => useVerifyEmail(), { wrapper });
        await waitFor(() => expect(result.current.state).toBe('verified'));
        expect(result.current.signInHref).toBe('/login');
    });

    it('signs in back to the create form with the picked plan', async () => {
        apiPost.mockResolvedValue(undefined);
        const link = '/events/new?step=details&type=wedding&plan=START';
        rememberPendingCreateEventPath(link);
        const { result } = renderHook(() => useVerifyEmail(), { wrapper });
        await waitFor(() => expect(result.current.state).toBe('verified'));
        expect(new URLSearchParams(result.current.signInHref.split('?')[1]).get('next')).toBe(link);
    });
});
