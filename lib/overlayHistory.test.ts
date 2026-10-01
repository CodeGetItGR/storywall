import { beforeEach, describe, expect, it, vi } from 'vitest';

type OverlayHistoryModule = typeof import('@/lib/overlayHistory');

// jsdom fires popstate asynchronously after a traversal, and a skip starts a
// second one; settle until no further popstate arrives.
async function goBack() {
    let pops = 0;
    const onPop = () => (pops += 1);
    window.addEventListener('popstate', onPop);
    window.history.back();
    let seen = -1;
    while (seen !== pops) {
        seen = pops;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.removeEventListener('popstate', onPop);
}

describe('overlayHistory', () => {
    let overlayHistory: OverlayHistoryModule;

    beforeEach(async () => {
        // Layer and skip bookkeeping is module state; start every test clean.
        vi.resetModules();
        overlayHistory = await import('@/lib/overlayHistory');
        window.history.replaceState(null, '', '/admin#start');
    });

    it('pushes a page entry so Back returns to the previous view', async () => {
        overlayHistory.pushPageEntry('#metrics');
        overlayHistory.pushPageEntry('#plans');

        await goBack();

        expect(window.location.hash).toBe('#metrics');
    });

    it('closes an open overlay on Back without leaving the view', async () => {
        overlayHistory.pushPageEntry('#plans');
        const onClose = vi.fn();
        overlayHistory.registerOverlayHistory({ id: 'drawer', onClose });

        await goBack();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(window.location.hash).toBe('#plans');
    });

    it('skips the leftover entry on Back after the owner closes the overlay', async () => {
        overlayHistory.pushPageEntry('#metrics');
        overlayHistory.pushPageEntry('#plans');
        const registration = overlayHistory.registerOverlayHistory({ id: 'drawer', onClose: vi.fn() });

        registration.remove();
        await goBack();

        expect(window.location.hash).toBe('#metrics');
    });

    it('reuses the leftover entry of a closed overlay for the next view', async () => {
        overlayHistory.pushPageEntry('#metrics');
        const registration = overlayHistory.registerOverlayHistory({ id: 'drawer', onClose: vi.fn() });
        registration.requestClose();
        const lengthAfterClose = window.history.length;

        overlayHistory.pushPageEntry('#plans');

        expect(window.history.length).toBe(lengthAfterClose);
        await goBack();
        expect(window.location.hash).toBe('#metrics');
    });
});
