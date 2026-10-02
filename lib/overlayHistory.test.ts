import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    // Next's app router patches pushState/replaceState: a call whose state
    // carries its `__NA` marker is treated as its own and not synced into the
    // router's URL. A later router.refresh() (the language switch) rewrites the
    // address bar with that URL, so a stale one sends the admin to `#metrics`.
    describe('with the Next router URL', () => {
        const nextInternals = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: [] } };
        let originalPush: History['pushState'];
        let originalReplace: History['replaceState'];
        let routerUrl: string;

        function patched(original: History['pushState']): History['pushState'] {
            return (data, unused, url) => {
                if (data?.__NA) return original(data, unused, url);
                if (url) {
                    const next = new URL(url, window.location.href);
                    routerUrl = `${next.pathname}${next.search}${next.hash}`;
                }
                return original({ ...(data ?? {}), ...nextInternals }, unused, url);
            };
        }

        // What Next's HistoryUpdater does after router.refresh().
        function routerRefresh() {
            originalReplace(nextInternals, '', routerUrl);
        }

        beforeEach(() => {
            originalPush = window.history.pushState.bind(window.history);
            originalReplace = window.history.replaceState.bind(window.history);
            originalReplace(nextInternals, '', '/admin#metrics');
            routerUrl = '/admin#metrics';
            window.history.pushState = patched(originalPush);
            window.history.replaceState = patched(originalReplace);
        });

        afterEach(() => {
            window.history.pushState = originalPush;
            window.history.replaceState = originalReplace;
        });

        it.each(['fresh entry', 'leftover overlay entry'])('follows a page entry (%s)', (kind) => {
            if (kind === 'leftover overlay entry') {
                overlayHistory.registerOverlayHistory({ id: 'drawer', onClose: vi.fn() }).requestClose();
            }
            overlayHistory.pushPageEntry('#withdrawals');

            routerRefresh();

            expect(window.location.hash).toBe('#withdrawals');
        });

        // A plain <a href="#orders/…"> is handled by the browser alone; Next never hears of it.
        it('catches up with a hash the browser changed on its own', () => {
            originalPush(null, '', '#orders/abc');

            overlayHistory.syncRouterWithAddressBar();
            routerRefresh();

            expect(window.location.hash).toBe('#orders/abc');
        });

        it('keeps the overlay markers of the current entry when catching up', () => {
            overlayHistory.registerOverlayHistory({ id: 'drawer', onClose: vi.fn() });
            const stateBefore = window.history.state;

            overlayHistory.syncRouterWithAddressBar();

            expect(window.history.state).toEqual(stateBefore);
        });
    });
});
