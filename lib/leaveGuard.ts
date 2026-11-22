type Click = Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented' | 'target'>;
type Here = Pick<Location, 'origin' | 'pathname' | 'search'>;

// The page of this app a link click would open, or null when the click leaves the app, opens
// a new tab, downloads, stays on this page or isn't a plain click on a link.
export function inAppHref(event: Click, location: Here): string | null {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (!(event.target instanceof Element)) return null;
    const anchor = event.target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return null;
    if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return null;
    const url = new URL(anchor.href, location.origin);
    if (url.origin !== location.origin) return null;
    if (url.pathname === location.pathname && url.search === location.search) return null;
    return `${url.pathname}${url.search}${url.hash}`;
}
