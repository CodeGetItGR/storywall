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
    return (
        pathname === routes.feed ||
        pathname.startsWith(routes.feed + '/') ||
        pathname === routes.manage ||
        pathname.startsWith(routes.manage + '/') ||
        pathname === routes.tools.root ||
        pathname.startsWith(routes.tools.root + '/') ||
        pathname.startsWith('/story/') ||
        pathname.startsWith('/post/') ||
        pathname.startsWith('/events/')
    );
}
