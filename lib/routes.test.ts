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

    it('tools.galleryQr() resolves under /demo', () => {
        expect(routes.events.tools.galleryQr(DEMO_EVENT_ID)).toBe('/demo/tools/gallery/qr');
    });

    it('tools.wishbook() resolves under /demo', () => {
        expect(routes.events.tools.wishbook(DEMO_EVENT_ID)).toBe('/demo/tools/wishbook');
    });

    it('tools.rsvp() resolves under /demo', () => {
        expect(routes.events.tools.rsvp(DEMO_EVENT_ID)).toBe('/demo/tools/rsvp');
    });

    it('tools.rsvp() with a section param resolves under /demo', () => {
        expect(routes.events.tools.rsvp(DEMO_EVENT_ID, { section: 'reports' })).toBe('/demo/tools/rsvp?section=reports');
    });

    it('rsvpReport() with from resolves under /demo', () => {
        expect(routes.events.rsvpReport(DEMO_EVENT_ID, 'FULL_LIST', 'tools')).toBe('/demo/manage/rsvp/reports/FULL_LIST?from=tools');
    });

    it('a real event id is unaffected', () => {
        expect(routes.events.feed('real-event-id')).toBe('/events/real-event-id/feed');
    });

    it('manage() with a tab param includes it in the query string', () => {
        expect(routes.events.manage('real-event-id', { tab: 'help' })).toBe('/events/real-event-id/manage?tab=help');
    });

    it('rsvpReport() carries no param by default (manage origin)', () => {
        expect(routes.events.rsvpReport('real-event-id', 'FULL_LIST')).toBe('/events/real-event-id/manage/rsvp/reports/FULL_LIST');
    });
});
