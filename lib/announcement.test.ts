import { describe, expect, it } from 'vitest';

import { announcementBlock } from '@/lib/announcement';

const posts = (isAvailable: boolean) => [{ moduleKey: 'posts', isAvailable, isEnabled: true, configuration: {} }] as never;

describe('announcementBlock', () => {
    it('lets a live event with posts available through', () => {
        expect(announcementBlock({ status: 'ACTIVE', modules: posts(true) })).toBeNull();
    });

    it('blocks an event that is not live', () => {
        expect(announcementBlock({ status: 'DRAFT', modules: posts(true) })).toBe('readOnly');
    });

    it('blocks an event without the posts module', () => {
        expect(announcementBlock({ status: 'ACTIVE', modules: posts(false) })).toBe('moduleUnavailable');
    });

    it('does not block while the event is still loading', () => {
        expect(announcementBlock(null)).toBeNull();
    });
});
