const OVERLAY_HISTORY_KEY = '__storywallOverlayStack';
const OVERLAY_ANCHOR_KEY = '__storywallOverlayAnchor';

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
        window.location.href
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
    if (destinationAnchor && skippableAnchors.delete(destinationAnchor)) {
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
    const activeLayer: ActiveOverlayLayer = { ...layer, active: true, openedHref };
    activeLayers.push(activeLayer);
    ensureListening();

    // Mark the entry underneath the overlay without changing its URL. This lets
    // us skip that same-page entry later when a close button dismisses the UI.
    window.history.replaceState({ ...currentState, [OVERLAY_ANCHOR_KEY]: layer.id }, '', openedHref);
    window.history.pushState(
        {
            ...currentState,
            [OVERLAY_HISTORY_KEY]: [...currentStack, layer.id],
            [OVERLAY_ANCHOR_KEY]: undefined,
        },
        '',
        openedHref
    );

    function remove(markAnchorSkippable = false) {
        if (!activeLayer.active) return;
        activeLayer.active = false;

        const index = activeLayers.findIndex((activeLayer) => activeLayer.id === layer.id);
        if (index >= 0) activeLayers.splice(index, 1);

        // A controlled close may coincide with route navigation. Removing only
        // our state marker cannot undo or otherwise compete with that navigation.
        removeLayerFromCurrentEntry(layer.id);
        if (markAnchorSkippable && activeLayer.openedHref === window.location.href) skippableAnchors.add(layer.id);
        stopListeningWhenIdle();
    }

    function requestClose() {
        if (!activeLayer.active) {
            layer.onClose();
            return;
        }

        // UI dismissal never traverses history. The URL may have changed while
        // the overlay was open, so only a real browser Back event may go back.
        remove(true);
        layer.onClose();
    }

    return { requestClose, remove };
}
