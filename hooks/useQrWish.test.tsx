import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSendQrWish } from '@/hooks/useQrWish';

const { publicPost } = vi.hoisted(() => ({ publicPost: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { publicPost } }));

function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useSendQrWish', () => {
    it('posts the wish and acceptance to the code, with no account', async () => {
        publicPost.mockResolvedValue({ id: 'w1', createdAt: '2026-11-03T10:00:00Z' });
        const { result } = renderHook(() => useSendQrWish(), { wrapper });

        result.current.mutate({
            token: 'tok',
            guestName: 'Maria',
            message: 'Να ζήσετε!',
            acceptance: { termsVersion: '2026-10-04', guidelinesVersion: '2026-09-30' },
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(publicPost).toHaveBeenCalledWith('/api/qr/tok/wishes', {
            guestName: 'Maria',
            message: 'Να ζήσετε!',
            ageConfirmed: true,
            acceptedTermsVersion: '2026-10-04',
            acceptedGuidelinesVersion: '2026-09-30',
        });
    });
});
