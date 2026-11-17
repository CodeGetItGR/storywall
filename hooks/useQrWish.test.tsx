import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useSendQrWish } from '@/hooks/useQrWish';

const { publicPost, publicPostForm } = vi.hoisted(() => ({ publicPost: vi.fn(), publicPostForm: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { publicPost, publicPostForm } }));

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
        expect(publicPostForm).not.toHaveBeenCalled();
    });

    it('sends a recording as multipart, with the acceptance inside the wish part', async () => {
        publicPostForm.mockResolvedValue({ id: 'w2', createdAt: '2026-11-16T10:00:00Z' });
        publicPost.mockClear();
        const audio = new Blob(['x'], { type: 'audio/webm' });
        const { result } = renderHook(() => useSendQrWish(), { wrapper });

        result.current.mutate({
            token: 'tok',
            guestName: 'Maria',
            message: '',
            audio,
            acceptance: { termsVersion: '2026-10-04', guidelinesVersion: '2026-09-30' },
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const [path, form] = publicPostForm.mock.calls[0] as [string, FormData];
        expect(path).toBe('/api/qr/tok/wishes');
        expect(form.get('audio')).toBeInstanceOf(Blob);
        expect(JSON.parse(await (form.get('wish') as Blob).text())).toEqual({
            guestName: 'Maria',
            ageConfirmed: true,
            acceptedTermsVersion: '2026-10-04',
            acceptedGuidelinesVersion: '2026-09-30',
        });
        expect(publicPost).not.toHaveBeenCalled();
    });
});
