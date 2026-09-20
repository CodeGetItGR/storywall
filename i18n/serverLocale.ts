import { getLocale } from 'next-intl/server';

// Server Components use the same resolved locale as next-intl. This lets
// locale-prefixed public pages override a stale locale cookie before sending
// Accept-Language to Spring.
export async function getServerLocale() {
    return getLocale();
}
