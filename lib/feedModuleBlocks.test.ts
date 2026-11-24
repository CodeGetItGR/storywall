import { describe, expect, it } from 'vitest';

import { defaultFeedLayout } from '@/lib/feedLayout';
import { feedModuleSection, feedModuleToolHref, layoutHasModule, moduleOfBlock } from '@/lib/feedModuleBlocks';

describe('module blocks', () => {
    it('build a plain block for one module', () => {
        const section = feedModuleSection('wishbook', () => 'id-1');
        expect(section).toMatchObject({ id: 'id-1', type: 'feedModule', visible: true, data: { module: 'wishbook' } });
        expect(moduleOfBlock(section)).toBe('wishbook');
    });

    it("open each module's tool", () => {
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
