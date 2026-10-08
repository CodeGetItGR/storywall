// Marks history entries that were opened from another page of the app, so a back
// button can step back with the browser only when that keeps the user in the app.
// history.length can't tell: it also counts entries from other sites.
const IN_APP_PREVIOUS_KEY = '__storywallInAppPrevious';

let installed = false;

function withInAppPrevious(state: unknown) {
    return { ...(state && typeof state === 'object' ? state : {}), [IN_APP_PREVIOUS_KEY]: true };
}

export function hasInAppPrevious(): boolean {
    const state: unknown = window.history.state;
    return Boolean(state && typeof state === 'object' && (state as Record<string, unknown>)[IN_APP_PREVIOUS_KEY]);
}

// Every pushState comes from in-app navigation, so the entry it adds has an in-app
// entry behind it. A replaceState keeps the entry behind it, so it keeps the mark.
export function installInAppHistoryTracking() {
    if (installed) return;
    installed = true;

    const history = window.history;
    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);

    history.pushState = (state, unused, url) => pushState(withInAppPrevious(state), unused, url);
    history.replaceState = (state, unused, url) => replaceState(hasInAppPrevious() ? withInAppPrevious(state) : state, unused, url);
}
