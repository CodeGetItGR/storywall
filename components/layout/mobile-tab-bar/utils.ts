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

export function isEventRoute(pathname: string) {
    return pathname === routes.feed || pathname.startsWith(routes.feed + '/') || pathname.startsWith('/post/') || pathname.startsWith('/events/');
}

export function isFeedRoute(pathname: string) {
    return pathname === routes.feed || pathname.startsWith(routes.feed + '/') || /^\/events\/[^/]+\/feed(\/|$)/.test(pathname);
}
