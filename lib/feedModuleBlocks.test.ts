import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto, EventModuleResponseDto, FeedLayoutDto } from '@/lib/api/types';
import { defaultFeedLayout } from '@/lib/feedLayout';
import {
    feedLayoutDrawsModule,
    feedModuleSection,
    feedModuleToolHref,
    feedScheduleEditorHref,
    layoutHasModule,
    moduleOfBlock,
} from '@/lib/feedModuleBlocks';

describe('module blocks', () => {
    it('build a plain block for one module', () => {
        const section = feedModuleSection('wishbook', () => 'id-1');
        expect(section).toMatchObject({ id: 'id-1', type: 'feedModule', visible: true, data: { module: 'wishbook' } });
        expect(moduleOfBlock(section)).toBe('wishbook');
    });

    it("open each module's tool", () => {
        expect(feedScheduleEditorHref('e1')).toBe('/events/e1/tools/schedule?section=schedule');
        expect(feedModuleToolHref('e1', 'wishbook')).toBe('/events/e1/tools/wishbook');
        expect(feedModuleToolHref('e1', 'wishlist')).toBe('/events/e1/tools/gifts');
        expect(feedModuleToolHref('e1', 'he_or_she')).toBe('/events/e1/tools/he-or-she');
    });

    it('know which modules a layout already holds', () => {
        const layout = defaultFeedLayout();
        expect(layoutHasModule(layout, 'rsvp')).toBe(true);
        expect(layoutHasModule(layout, 'playlist')).toBe(false);
        const withPlaylist = { ...layout, sections: [...layout.sections, feedModuleSection('playlist', () => 'p')] };
        expect(layoutHasModule(withPlaylist, 'playlist')).toBe(true);
    });
});

describe('feedLayoutDrawsModule', () => {
    const smd = { moduleKey: 'save_my_date', isAvailable: true } as EventModuleResponseDto;
    const event = (modules: EventModuleResponseDto[], endAt: string | null = null) =>
        ({ modules, schedule: { endAt } }) as Pick<EventDetailResponseDto, 'modules' | 'schedule'>;
    const layout = (visible: boolean) => {
        const document = defaultFeedLayout();
        document.sections.push({ ...feedModuleSection('gallery', () => 'g'), visible });
        return { document, revision: 1 } as unknown as FeedLayoutDto;
    };

    it('is true for a shown block on a live Save my date event', () => {
        expect(feedLayoutDrawsModule(layout(true), event([smd]), 'gallery')).toBe(true);
        expect(feedLayoutDrawsModule(layout(true), event([smd]), 'wishbook')).toBe(false);
    });

    it('is false for a hidden block, without Save my date, after the event or with nothing saved', () => {
        expect(feedLayoutDrawsModule(layout(false), event([smd]), 'gallery')).toBe(false);
        expect(feedLayoutDrawsModule(layout(true), event([]), 'gallery')).toBe(false);
        expect(feedLayoutDrawsModule(layout(true), event([smd], '2000-01-01T00:00:00Z'), 'gallery')).toBe(false);
        expect(feedLayoutDrawsModule(null, event([smd]), 'gallery')).toBe(false);
    });
});
