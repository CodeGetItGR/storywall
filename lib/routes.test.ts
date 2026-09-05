import { describe, expect, it } from 'vitest';

import { DEMO_EVENT_ID } from '@/lib/demo/demoConstants';
import { routes } from '@/lib/routes';

describe('routes.events for the demo event id', () => {
    it('feed() resolves under /demo instead of /events/{id}', () => {
        expect(routes.events.feed(DEMO_EVENT_ID)).toBe('/demo/feed');
    });

    it('manage() resolves under /demo', () => {
        expect(routes.events.manage(DEMO_EVENT_ID)).toBe('/demo/manage');
    });

    it('tools.gallery() resolves under /demo', () => {
        expect(routes.events.tools.gallery(DEMO_EVENT_ID)).toBe('/demo/tools/gallery');
    });

    it('tools.wishbook() resolves under /demo', () => {
        expect(routes.events.tools.wishbook(DEMO_EVENT_ID)).toBe('/demo/tools/wishbook');
    });

    it('tools.rsvp() resolves under /demo', () => {
        expect(routes.events.tools.rsvp(DEMO_EVENT_ID)).toBe('/demo/tools/rsvp');
    });

    it('a real event id is unaffected', () => {
        expect(routes.events.feed('real-event-id')).toBe('/events/real-event-id/feed');
    });
});
