import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    announcementComposerHref,
    canAnnounce,
    isAnnouncementComposeRequest,
    isAnnouncementOpen,
    openAnnouncementComposerFromHref,
    subscribeAnnouncementComposerRequests,
    withoutComposeParam,
} from '@/lib/announcementComposer';
import type { VendorMeDto } from '@/lib/api/types';

const planner = (overrides: Partial<VendorMeDto> = {}) =>
    ({ vendorType: 'PLANNER', capabilities: ['ANNOUNCE'], accessOpen: true, toolsOff: null, ...overrides }) as unknown as VendorMeDto;

describe('announcement composer link', () => {
    it('points at the feed with compose=announcement', () => {
        expect(announcementComposerHref('e1')).toBe('/events/e1/feed?compose=announcement');
        expect(isAnnouncementComposeRequest(new URLSearchParams('compose=announcement'))).toBe(true);
        expect(isAnnouncementComposeRequest(new URLSearchParams('compose=post'))).toBe(false);
    });

    it('drops only the compose param', () => {
        expect(withoutComposeParam('/events/e1/feed', 'compose=announcement')).toBe('/events/e1/feed');
        expect(withoutComposeParam('/events/e1/feed', 'post=p1&compose=announcement')).toBe('/events/e1/feed?post=p1');
    });
});

describe('canAnnounce', () => {
    const base = { canComposePost: true, isHost: false, vendorRole: null, isDemoVisitor: false };

    it('lets hosts and planners with ANNOUNCE in', () => {
        expect(canAnnounce({ ...base, isHost: true })).toBe(true);
        expect(canAnnounce({ ...base, vendorRole: planner() })).toBe(true);
    });

    it('keeps guests, other vendors and a closed planner out', () => {
        expect(canAnnounce(base)).toBe(false);
        expect(canAnnounce({ ...base, vendorRole: planner({ capabilities: ['QR_READ'] }) })).toBe(false);
        expect(canAnnounce({ ...base, vendorRole: planner({ accessOpen: false }) })).toBe(false);
    });

    it('needs a post-able event and no demo visitor', () => {
        expect(canAnnounce({ ...base, isHost: true, canComposePost: false })).toBe(false);
        expect(canAnnounce({ ...base, isHost: true, isDemoVisitor: true })).toBe(false);
    });
});

describe('isAnnouncementOpen', () => {
    const posts = [{ moduleKey: 'posts', isAvailable: true }] as never;

    it('needs a live event with the posts module', () => {
        expect(isAnnouncementOpen({ status: 'ACTIVE', modules: posts })).toBe(true);
        expect(isAnnouncementOpen({ status: 'DRAFT', modules: posts })).toBe(false);
        expect(isAnnouncementOpen({ status: 'ACTIVE', modules: [] })).toBe(false);
        expect(isAnnouncementOpen(null)).toBe(false);
    });
});

describe('openAnnouncementComposerFromHref', () => {
    let unsubscribe: (() => void) | null = null;
    afterEach(() => {
        unsubscribe?.();
        unsubscribe = null;
        window.history.replaceState({}, '', '/');
    });

    it('opens in place only on the page the link points at', () => {
        const listener = vi.fn();
        unsubscribe = subscribeAnnouncementComposerRequests(listener);
        window.history.replaceState({}, '', '/events/e1/feed');

        expect(openAnnouncementComposerFromHref('/events/e1/feed?compose=announcement')).toBe(true);
        expect(listener).toHaveBeenCalledTimes(1);

        window.history.replaceState({}, '', '/events/e1/tools/vendors/me');
        expect(openAnnouncementComposerFromHref('/events/e1/feed?compose=announcement')).toBe(false);
        expect(openAnnouncementComposerFromHref('/events/e1/tools/vendors/me')).toBe(false);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('navigates when no composer is listening', () => {
        window.history.replaceState({}, '', '/events/e1/feed');
        expect(openAnnouncementComposerFromHref('/events/e1/feed?compose=announcement')).toBe(false);
    });
});
