import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditBannerPreview } from '@/hooks/useFeedEditBannerPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { type FeedLayoutView, readFeedLayout } from '@/lib/feedLayout';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationThemeCardDto } from '@/lib/invitation/themeCatalogue';
import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';

const mocks = vi.hoisted(() => ({
    layout: null as unknown as FeedLayoutView & { isLoading: boolean; isLoaded: boolean },
    catalogue: { themes: null as InvitationThemeCardDto[] | null, isPending: true },
    catalogueEnabled: [] as boolean[],
    fetchTheme: vi.fn(),
}));

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/hooks/useFeedLayout', () => ({ useFeedLayout: () => mocks.layout }));
vi.mock('@/hooks/useInvitationThemeCatalogue', () => ({
    useInvitationThemeCatalogue: ({ enabled }: { enabled: boolean }) => {
        mocks.catalogueEnabled.push(enabled);
        return { ...mocks.catalogue, isError: false, retry: vi.fn() };
    },
}));
vi.mock('@/hooks/useInvitationThemeCards', () => ({ fetchInvitationTheme: mocks.fetchTheme }));
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => ({ data: [] }) }));

const event = { id: 'e-1', eventType: 'WEDDING', title: 'Anna & Nikos', theme: null } as unknown as EventDetailResponseDto;
const card = (slug: string, eventType: string) => ({ slug, name: slug, eventType, cardColor: null, cardThumbUrl: null });
const catalogue = [card('lamb', 'BAPTISM'), card('rose', 'WEDDING'), card('ivy', 'WEDDING')];
const rose = {
    slug: 'rose',
    name: 'Rose',
    eventType: 'WEDDING',
    design: SAMPLE_THEME,
    document: SAMPLE_DOCUMENT,
    assetUrls: {},
} as unknown as InvitationThemePublicDto;
const wallLayout = { ...readFeedLayout(null, null), isLoading: false, isLoaded: true };

function renderPreview(forEvent = event) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useFeedEditBannerPreview(forEvent), { wrapper });
}

beforeEach(() => {
    mocks.layout = wallLayout;
    mocks.catalogue = { themes: catalogue, isPending: false };
    mocks.catalogueEnabled = [];
    mocks.fetchTheme.mockReset();
    mocks.fetchTheme.mockResolvedValue(rose);
});

describe('useFeedEditBannerPreview', () => {
    it('waits for the layout', () => {
        mocks.layout = { ...wallLayout, isLoading: true, isLoaded: false };
        const { result } = renderPreview();
        expect(result.current).toBeNull();
        expect(mocks.catalogueEnabled.every((enabled) => !enabled)).toBe(true);
    });

    it('waits for the catalogue on the wall theme', () => {
        mocks.catalogue = { themes: null, isPending: true };
        const { result } = renderPreview();
        expect(result.current).toBeNull();
        expect(mocks.catalogueEnabled.at(-1)).toBe(true);
        expect(mocks.fetchTheme).not.toHaveBeenCalled();
    });

    it("draws the cover in the catalogue's first theme for the event type", async () => {
        const { result } = renderPreview();
        expect(result.current).toBeNull();
        await waitFor(() => expect(result.current?.kind).toBe('invitation'));
        expect(mocks.fetchTheme).toHaveBeenCalledWith('rose');
        expect(mocks.fetchTheme).toHaveBeenCalledTimes(1);
    });

    it('draws the wall look when the stand-in theme fails to load', async () => {
        mocks.fetchTheme.mockRejectedValue(new Error('down'));
        const { result } = renderPreview();
        await waitFor(() => expect(result.current?.kind).toBe('wall'));
    });

    it("draws the layout's own theme without reading the catalogue", () => {
        mocks.layout = { ...wallLayout, themeSlug: 'own', theme: SAMPLE_THEME };
        mocks.catalogue = { themes: null, isPending: true };
        const { result } = renderPreview();
        expect(result.current?.kind).toBe('invitation');
        expect(mocks.catalogueEnabled.every((enabled) => !enabled)).toBe(true);
        expect(mocks.fetchTheme).not.toHaveBeenCalled();
    });

    it('draws the wall look for an event type without Save my date themes', () => {
        const { result } = renderPreview({ ...event, eventType: 'BIRTHDAY' } as unknown as EventDetailResponseDto);
        expect(result.current?.kind).toBe('wall');
        expect(mocks.catalogueEnabled.every((enabled) => !enabled)).toBe(true);
    });
});
