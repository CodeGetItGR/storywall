import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useInvitationThemeCards } from '@/hooks/useInvitationThemeCards';
import { SAMPLE_THEME } from '@/lib/invitation/samples';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api: { get: apiGet } }));

const ROSE = { slug: 'rose', name: 'Rose', eventType: 'WEDDING', cardColor: '#FBE6E4', cardThumbUrl: 'https://media.example/rose.webp' };
const DINO = { slug: 'dino', name: 'Dino', eventType: 'BAPTISM', cardColor: null, cardThumbUrl: null };
const ROSE_DESIGN = { ...SAMPLE_THEME, colors: { ...SAMPLE_THEME.colors, primary: '#9C4A5A' }, fonts: { ...SAMPLE_THEME.fonts, title: 'Lumiere' } };
const LUMIERE = { key: 'lumiere', familyName: 'Lumiere', fallback: 'serif', url: '/api/theme-fonts/lumiere/1.woff2' };

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockImplementation(async (path: string) => {
        if (path === '/api/invitation-themes?eventType=WEDDING') return [ROSE];
        if (path === '/api/invitation-themes?eventType=BAPTISM') return [DINO];
        if (path === '/api/invitation-themes/rose') return { ...ROSE, design: ROSE_DESIGN, document: {}, assetUrls: {} };
        if (path === '/api/invitation-fonts/files') return [LUMIERE];
        throw new Error(`unexpected ${path}`);
    });
});

describe('useInvitationThemeCards', () => {
    it("lists the event type's themes with each one's title font and colour", async () => {
        const { result } = renderHook(() => useInvitationThemeCards('WEDDING', { enabled: true }), { wrapper });
        await waitFor(() => expect(result.current.cards[0]?.titleFontFamily).toBe('Lumiere'));
        expect(result.current.cards).toEqual([
            { slug: 'rose', name: 'Rose', cardColor: '#FBE6E4', illustrationUrl: 'https://media.example/rose.webp', titleFontFamily: 'Lumiere', titleColor: '#9C4A5A' },
        ]);
    });

    it('declares the uploaded fonts the designs use', async () => {
        const { result } = renderHook(() => useInvitationThemeCards('WEDDING', { enabled: true }), { wrapper });
        await waitFor(() => expect(result.current.fontFaces).toContain('font-family:"Lumiere"'));
    });

    it('asks for nothing while off', () => {
        const { result } = renderHook(() => useInvitationThemeCards('WEDDING', { enabled: false }), { wrapper });
        expect(result.current.cards).toEqual([]);
        expect(apiGet).not.toHaveBeenCalled();
    });
});
