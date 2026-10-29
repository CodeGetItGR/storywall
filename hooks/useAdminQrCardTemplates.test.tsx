import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), postForm: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api }));

import { useCreateQrCardTemplate, useUploadQrCardArtwork } from '@/hooks/useAdminQrCardTemplates';

function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue({}));
});

describe('admin QR card template writes', () => {
    it('creates at the catalog endpoint', async () => {
        const { result } = renderHook(() => useCreateQrCardTemplate(), { wrapper });
        const input = {
            name: { en: 'Linen', el: 'Λινό' },
            eventTypes: ['WEDDING' as const],
            sortOrder: 0,
            textColor: '#241F1A',
            codeColor: '#241F1A',
            centerLogo: true,
        };
        await act(() => result.current.mutateAsync(input));
        expect(api.post).toHaveBeenCalledWith('/api/admin/qr-card-templates', input);
    });

    it('uploads the artwork as the file part', async () => {
        const { result } = renderHook(() => useUploadQrCardArtwork(), { wrapper });
        const file = new File(['x'], 'linen.png', { type: 'image/png' });
        await act(() => result.current.mutateAsync({ id: 't1', file }));
        const [path, body] = api.postForm.mock.calls[0] as [string, FormData];
        expect(path).toBe('/api/admin/qr-card-templates/t1/artwork');
        expect((body.get('file') as File).name).toBe('linen.png');
    });
});
