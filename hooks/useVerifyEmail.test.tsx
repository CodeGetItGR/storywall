import { renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVerifyEmail } from '@/hooks/useVerifyEmail';

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
});
