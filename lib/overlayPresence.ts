// Tracks which overlays (modals, sheets, fullscreen viewers, menu popovers)
// are currently open so chrome like the composer FAB can step aside. This is
// separate from `overlayHistory`: presence is about what is on screen, history
// is about what the browser Back button should dismiss.

const openOverlayIds = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

export function getHasOpenOverlay(): boolean {
    return openOverlayIds.size > 0;
}

export function subscribeOverlayPresence(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function registerOverlayPresence(id: string): () => void {
    const wasOpen = getHasOpenOverlay();
    openOverlayIds.add(id);
    if (!wasOpen) notify();

    return () => {
        if (!openOverlayIds.delete(id)) return;
        if (!getHasOpenOverlay()) notify();
    };
}
