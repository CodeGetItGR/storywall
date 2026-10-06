import { routes } from '@/lib/routes';

export function isPathActive(pathname: string, href: string, searchParams = '') {
    const [itemPathname, itemSearchParams] = href.split('?');

    if (itemSearchParams) {
        return pathname === itemPathname && searchParams === itemSearchParams;
    }

    if (pathname === itemPathname && new URLSearchParams(searchParams).has('tab')) {
        return false;
    }

    return pathname === itemPathname || pathname.startsWith(itemPathname + '/');
}

// One menu can hold an item and its child page (/manage and /manage/qr): only the
// longest matching href counts as active, so the parent isn't highlighted too.
export function mostSpecificActiveHref(pathname: string, hrefs: string[], searchParams = ''): string | null {
    let best: string | null = null;
    for (const href of hrefs) {
        if (!isPathActive(pathname, href, searchParams)) continue;
        if (best === null || href.split('?')[0].length > best.split('?')[0].length) best = href;
    }
    return best;
}

export function isEventRoute(pathname: string) {
    return pathname === routes.feed || pathname.startsWith(routes.feed + '/') || pathname.startsWith('/post/') || pathname.startsWith('/events/');
}

export function isFeedRoute(pathname: string) {
    // The demo event's feed sits at /demo/{eventType}/feed, outside the /events tree.
    return pathname === routes.feed || pathname.startsWith(routes.feed + '/') || /^\/(events|demo)\/[^/]+\/feed(\/|$)/.test(pathname);
}
