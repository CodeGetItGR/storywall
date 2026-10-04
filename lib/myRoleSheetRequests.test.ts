import { describe, expect, it, vi } from 'vitest';

import { openMyRoleSheetFromHref, requestMyRoleSheet, subscribeMyRoleSheetRequests } from '@/lib/myRoleSheetRequests';

describe('my role sheet requests', () => {
    it('notifies subscribers until they unsubscribe', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeMyRoleSheetRequests(listener);

        requestMyRoleSheet();
        unsubscribe();
        requestMyRoleSheet();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('reports whether a host took the request', () => {
        expect(requestMyRoleSheet()).toBe(false);
        const unsubscribe = subscribeMyRoleSheetRequests(vi.fn());
        expect(requestMyRoleSheet()).toBe(true);
        unsubscribe();
    });

    it('opens in place only for the role sheet link with a host mounted', () => {
        const listener = vi.fn();
        expect(openMyRoleSheetFromHref('/events/e1/feed?sheet=role')).toBe(false);

        const unsubscribe = subscribeMyRoleSheetRequests(listener);
        expect(openMyRoleSheetFromHref('/events/e1/tools/rsvp')).toBe(false);
        expect(openMyRoleSheetFromHref('/events/e1/feed?sheet=role')).toBe(true);
        unsubscribe();

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
