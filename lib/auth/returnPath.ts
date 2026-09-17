import type { PlatformRole } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export const AUTH_RETURN_PATH_PARAM = 'next';

const APP_ORIGIN = 'https://storywall.local';

// `next` is read from a URL query parameter, so it must never be used as an
// arbitrary URL. Keep only same-origin, path-based destinations.
export function getSafeReturnPath(value: string | null): string | null {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null;

    try {
        const url = new URL(value, APP_ORIGIN);
        if (url.origin !== APP_ORIGIN) return null;

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}

export function getPostAuthRedirectPath(role: PlatformRole, returnPath: string | null): string {
    if (role === 'ADMIN') return routes.admin;
    return getSafeReturnPath(returnPath) ?? routes.feed;
}
