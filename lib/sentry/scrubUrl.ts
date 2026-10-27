import { redactApiPath } from '@/lib/betaFeedback/routeTemplates';

// Pages whose last segment is a capability token: whoever holds the URL holds the access.
const PAGE_TOKEN_ROUTE = /^(\/(?:gift|invite|partners|q))\/[^/]+/;

// What Sentry may keep of a URL: no query or fragment (reset tokens, presigned
// signatures) and no token in the path. Absolute URLs keep their origin.
export function scrubUrl(url: string): string {
    let origin = '';
    let path = url;
    const absolute = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i.exec(url);
    if (absolute) {
        origin = absolute[0];
        path = url.slice(origin.length) || '/';
    }
    const pathname = redactApiPath(path);
    return origin + pathname.replace(PAGE_TOKEN_ROUTE, '$1/:token');
}
