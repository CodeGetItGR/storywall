const OVERLAY_HISTORY_KEY = '__storywallOverlayStack';
const OVERLAY_ANCHOR_KEY = '__storywallOverlayAnchor';
const OVERLAY_BASE_KEY = '__storywallOverlayBase';

type OverlayLayer = {
    id: string;
    onClose: () => void;
};

type ActiveOverlayLayer = OverlayLayer & {
    active: boolean;
    openedHref: string;
};

export type OverlayHistoryRegistration = {
    requestClose: () => void;
    remove: () => void;
};

const activeLayers: ActiveOverlayLayer[] = [];
const skippableAnchors = new Set<string>();
let listening = false;
let registrationCount = 0;

function getOverlayStack(state: History['state']): string[] {
    if (!state || typeof state !== 'object') return [];

    const stack = (state as Record<string, unknown>)[OVERLAY_HISTORY_KEY];
    return Array.isArray(stack) ? stack.filter((value): value is string => typeof value === 'string') : [];
}

function getOverlayAnchor(state: History['state']): string | null {
    if (!state || typeof state !== 'object') return null;

    const anchor = (state as Record<string, unknown>)[OVERLAY_ANCHOR_KEY];
    return typeof anchor === 'string' ? anchor : null;
}

function replaceOverlayStack(stack: string[]) {
    const currentState = window.history.state;
    window.history.replaceState(
        {
            ...(currentState && typeof currentState === 'object' ? currentState : {}),
            [OVERLAY_HISTORY_KEY]: stack,
        },
        '',
        window.location.href,
    );
}

function removeLayerFromCurrentEntry(layerId: string) {
    const stack = getOverlayStack(window.history.state);
    if (!stack.includes(layerId)) return;

    replaceOverlayStack(stack.filter((id) => id !== layerId));
}

function stopListeningWhenIdle() {
    if (!listening || activeLayers.length > 0 || skippableAnchors.size > 0) return;

    window.removeEventListener('popstate', handlePopState);
    listening = false;
}

function handlePopState(event: PopStateEvent) {
    const destinationAnchor = getOverlayAnchor(event.state);
    const shouldSkipAnchor = destinationAnchor !== null && skippableAnchors.has(destinationAnchor);

    // A skip is only ever valid for the traversal immediately following the
    // close that armed it. An anchor is written into a history entry and can
    // never be cleaned off again — by the time the layer is removed we may not
    // be on that entry any more — so any other traversal has to disarm it
    // here. Left armed, a marker from an overlay closed long ago silently eats
    // a later Back and drops the user one page further than they asked for.
    skippableAnchors.clear();

    if (shouldSkipAnchor) {
        window.history.back();
        stopListeningWhenIdle();
        return;
    }

    const destinationStack = getOverlayStack(event.state);
    let closedLayer = false;

    // A single traversal can leave more than one controlled overlay behind when
    // a route change replaced an entry. Close every layer missing at the target.
    while (activeLayers.length > 0) {
        const topLayer = activeLayers.at(-1);
        if (!topLayer || destinationStack.includes(topLayer.id)) break;

        activeLayers.pop();
        topLayer.active = false;
        closedLayer = true;
        topLayer.onClose();
    }

    if (closedLayer) {
        stopListeningWhenIdle();
        return;
    }

    const topLayer = activeLayers.at(-1);
    if (!topLayer) {
        stopListeningWhenIdle();
        return;
    }

    // Parent-driven closes can leave an older same-page overlay entry behind.
    // Continue across those stale entries so one Back action still closes the
    // current top overlay instead of appearing to do nothing.
    const activeDestinationStack = destinationStack.filter((id) => activeLayers.some((layer) => layer.id === id));
    if (activeDestinationStack.at(-1) === topLayer.id) window.history.back();
}

function ensureListening() {
    if (listening) return;

    window.addEventListener('popstate', handlePopState);
    listening = true;
}

export function registerOverlayHistory(layer: OverlayLayer): OverlayHistoryRegistration {
    const openedHref = window.location.href;
    const currentState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
    const currentStack = getOverlayStack(window.history.state);

    // The caller's id comes from useId(), which is stable per tree position —
    // re-opening the same modal reuses it. Markers left in old history entries
    // outlive the overlay that wrote them, so a bare useId would let a stale
    // entry be mistaken for this registration. Qualify it per registration.
    const id = `${layer.id}#${(registrationCount += 1)}`;
    const activeLayer: ActiveOverlayLayer = { ...layer, id, active: true, openedHref };
    activeLayers.push(activeLayer);
    ensureListening();

    // Mark the entry underneath the overlay without changing its URL. This lets
    // us skip that same-page entry later when a close button dismisses the UI.
    window.history.replaceState({ ...currentState, [OVERLAY_ANCHOR_KEY]: id }, '', openedHref);
    window.history.pushState(
        {
            ...currentState,
            [OVERLAY_HISTORY_KEY]: [...currentStack, id],
            [OVERLAY_ANCHOR_KEY]: undefined,
            [OVERLAY_BASE_KEY]: openedHref,
        },
        '',
        openedHref,
    );

    // Every close that isn't a Back press — the X button or the owner closing
    // it after a save — leaves our entry behind on the same page. Arming the
    // anchor lets the next Back skip it instead of appearing to do nothing.
    function remove() {
        if (!activeLayer.active) return;
        activeLayer.active = false;

        const index = activeLayers.findIndex((candidate) => candidate.id === id);
        if (index >= 0) activeLayers.splice(index, 1);

        // A controlled close may coincide with route navigation. Removing only
        // our state marker cannot undo or otherwise compete with that navigation.
        removeLayerFromCurrentEntry(id);
        if (activeLayer.openedHref === window.location.href) skippableAnchors.add(id);
        stopListeningWhenIdle();
    }

    function requestClose() {
        if (!activeLayer.active) {
            layer.onClose();
            return;
        }

        // UI dismissal never traverses history. The URL may have changed while
        // the overlay was open, so only a real browser Back event may go back.
        remove();
        layer.onClose();
    }

    return { requestClose, remove };
}

// Next's patched pushState/replaceState skips syncing its router URL when the
// state carries these markers (it takes the call for its own), and copies them
// back itself. Left in, the router keeps the old URL and the next
// router.refresh() — e.g. a language switch — writes it back over the hash.
function withoutNextRouterMarkers(state: object): Record<string, unknown> {
    const {
        __NA: _appRouterMarker,
        __PRIVATE_NEXTJS_INTERNALS_TREE: _routerTree,
        ...rest
    } = state as Record<string, unknown>;
    return rest;
}

// Hands the address bar's URL to the Next router. A plain <a href="#…"> or a
// hand-edited hash changes the URL behind the router's back; call this before
// a router.refresh() so the refresh doesn't put the old URL back.
export function syncRouterWithAddressBar() {
    const currentState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
    window.history.replaceState(withoutNextRouterMarkers(currentState), '', window.location.href);
}

// A same-page navigation (a hash route) that should be its own Back step.
// A closed overlay leaves its entry behind; while we are still on it at the
// URL it opened from, it only duplicates the entry below, so it is reused
// instead of stacking one more dead Back press on top.
export function pushPageEntry(url: string) {
    const currentState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
    const {
        [OVERLAY_HISTORY_KEY]: stack,
        [OVERLAY_ANCHOR_KEY]: _anchor,
        [OVERLAY_BASE_KEY]: base,
        ...pageState
    } = withoutNextRouterMarkers(currentState);
    const isLeftoverOverlayEntry =
        activeLayers.length === 0 && Array.isArray(stack) && stack.length === 0 && base === window.location.href;

    // An armed skip belongs to the entry we are leaving; carried over, it would
    // make Back jump past the page the user just navigated away from.
    skippableAnchors.clear();
    stopListeningWhenIdle();

    if (isLeftoverOverlayEntry) window.history.replaceState(pageState, '', url);
    else window.history.pushState(pageState, '', url);
}
