import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useFeedSectionPreviews } from '@/hooks/useFeedSectionPreviews';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import type { NewSectionType } from '@/lib/invitation/newSection';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
// A query's data keeps its identity between renders.
const fonts = { data: [] };
vi.mock('@/hooks/useAdminInvitationThemes', () => ({ useInvitationFonts: () => fonts }));
const samplesFor = vi.fn((_slug: string | null) => null);
vi.mock('@/hooks/useThemeSampleSections', () => ({ useThemeSampleSections: (slug: string | null) => samplesFor(slug) }));

const document = defaultFeedLayout();
const theme = wallThemeDesign(null);
const media = () => undefined;
const props = (enabled: boolean, types: NewSectionType[]) => ({ types, themeSlug: 'olive', document, theme, media, eventType: 'WEDDING', enabled });

describe('useFeedSectionPreviews', () => {
    it('builds nothing until the picker first opens, but loads the samples already', () => {
        const { result } = renderHook(() => useFeedSectionPreviews(props(false, ['faq'])));
        expect(result.current).toBeNull();
        expect(samplesFor).toHaveBeenCalledWith('olive');
    });

    it('keeps the last cards while the picker closes, and rebuilds when it opens again', () => {
        const { result, rerender } = renderHook((p: ReturnType<typeof props>) => useFeedSectionPreviews(p), {
            initialProps: props(true, ['faq', 'dressCode']),
        });
        const opened = result.current;
        expect(opened?.items.map((item) => item.type)).toEqual(['faq', 'dressCode']);

        rerender(props(false, ['dressCode']));
        expect(result.current).toBe(opened);

        rerender(props(true, ['dressCode']));
        expect(result.current?.items.map((item) => item.type)).toEqual(['dressCode']);
    });
});
