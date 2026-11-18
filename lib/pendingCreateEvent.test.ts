import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearPendingCreateEventPath, readPendingCreateEventPath, rememberPendingCreateEventPath } from '@/lib/pendingCreateEvent';

const LINK = '/events/new?step=details&type=wedding&plan=START&option=o1';

describe('pendingCreateEvent', () => {
    afterEach(() => {
        vi.useRealTimers();
        window.localStorage.clear();
    });

    it('keeps the link with its plan', () => {
        rememberPendingCreateEventPath(LINK);
        expect(readPendingCreateEventPath()).toBe(LINK);
    });

    it('forgets it when cleared', () => {
        rememberPendingCreateEventPath(LINK);
        clearPendingCreateEventPath();
        expect(readPendingCreateEventPath()).toBeNull();
    });

    it('forgets it after a week', () => {
        vi.useFakeTimers();
        rememberPendingCreateEventPath(LINK);
        vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
        expect(readPendingCreateEventPath()).toBeNull();
    });

    it('ignores anything that is not the create form', () => {
        rememberPendingCreateEventPath('/events/event-1/feed');
        expect(readPendingCreateEventPath()).toBeNull();
        rememberPendingCreateEventPath('https://example.com/events/new');
        expect(readPendingCreateEventPath()).toBeNull();
        window.localStorage.setItem('pending_create_event_path', 'not json');
        expect(readPendingCreateEventPath()).toBeNull();
    });
});
