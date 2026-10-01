import { afterEach, describe, expect, it } from 'vitest';

import { DEMO_ACT_AS_HEADER, demoActAsHeaders, setDemoActAsMember } from '@/lib/demo/demoActAs';

describe('demoActAsHeaders', () => {
    afterEach(() => setDemoActAsMember(null));

    it('sends nothing while the admin posts as themselves', () => {
        expect(demoActAsHeaders('POST', '/api/posts')).toEqual({});
    });

    it('marks content writes with the chosen guest', () => {
        setDemoActAsMember({ eventId: 'evt', memberId: 'guest-1' });
        for (const [method, path] of [
            ['POST', '/api/posts'],
            ['POST', '/api/comments'],
            ['POST', '/api/reactions'],
            ['POST', '/api/stories/batch'],
            ['POST', '/api/events/evt/media/batch'],
            ['POST', '/api/events/evt/wishbook'],
            ['POST', '/api/playlist-suggestions'],
            ['DELETE', '/api/reactions/r1'],
        ]) {
            expect(demoActAsHeaders(method, path)).toEqual({ [DEMO_ACT_AS_HEADER]: 'guest-1' });
        }
    });

    it('edits and deletes content as the admin, who hosts the event', () => {
        setDemoActAsMember({ eventId: 'evt', memberId: 'guest-1' });
        for (const [method, path] of [
            ['PATCH', '/api/posts/p1'],
            ['DELETE', '/api/posts/p1'],
            ['DELETE', '/api/comments/c1'],
            ['DELETE', '/api/stories/s1'],
            ['DELETE', '/api/medias/m1'],
            ['DELETE', '/api/wishbook/w1'],
            ['DELETE', '/api/playlist-suggestions/ps1'],
        ]) {
            expect(demoActAsHeaders(method, path)).toEqual({});
        }
    });

    it('leaves reads and non-content writes alone', () => {
        setDemoActAsMember({ eventId: 'evt', memberId: 'guest-1' });
        expect(demoActAsHeaders('GET', '/api/events/evt/posts')).toEqual({});
        expect(demoActAsHeaders(undefined, '/api/posts')).toEqual({});
        expect(demoActAsHeaders('POST', '/api/event-members')).toEqual({});
        expect(demoActAsHeaders('PATCH', '/api/events/evt')).toEqual({});
        expect(demoActAsHeaders('POST', '/api/events/evt/modules')).toEqual({});
    });
});
