import { afterEach, describe, expect, it } from 'vitest';

import { rememberStartIntent, takeStartIntent } from '@/lib/invitation/startIntent';

const STORAGE_KEY = 'storywall:invitationStartEvent:v1';

afterEach(() => window.sessionStorage.clear());

describe('invitation start intent', () => {
    it('is read once', () => {
        rememberStartIntent({ eventId: 'evt-1', eventType: 'WEDDING' });
        expect(takeStartIntent()).toEqual({ eventId: 'evt-1', eventType: 'WEDDING' });
        expect(takeStartIntent()).toBeNull();
    });

    it('ignores a broken value', () => {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ eventId: '' }));
        expect(takeStartIntent()).toBeNull();
        window.sessionStorage.setItem(STORAGE_KEY, 'not json');
        expect(takeStartIntent()).toBeNull();
    });
});
