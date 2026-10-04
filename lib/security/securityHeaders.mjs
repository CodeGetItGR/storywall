// The security headers on every response, wired in next.config.mjs. Plain ESM
// so the config can import it, and apart from the config so tests can build it
// for any environment. Read at build time: changing an origin means a rebuild.

// Google Identity Services, per Google's own CSP guidance.
const GOOGLE_IDENTITY = 'https://accounts.google.com/gsi/';

// The demo's mock service worker (lib/demo/mockWorker.ts registers it at this path).
export const MOCK_SERVICE_WORKER_PATH = '/mockServiceWorker.js';

/** @param {string | undefined} url */
function originOf(url) {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

// MEDIA_IMAGE_HOSTS, as next.config.mjs reads it for next/image: each host bare
// and with any subdomain, since a presigned URL can put the bucket in the host.
/** @param {string | undefined} value */
export function mediaHostSources(value) {
    return (value ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean)
        .flatMap((host) => [`https://${host}`, `https://*.${host}`]);
}

/**
 * A static policy: nonces would force every page to render per request. That
 * leaves script-src needing 'unsafe-inline' for Next's inline bootstrap, so
 * every other directive stays as tight as the app allows.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {Record<string, string[]>}
 */
function pageDirectives(env) {
    const isDev = env.NODE_ENV !== 'production';
    // The Vercel toolbar on preview deployments, per Vercel's CSP guidance.
    const isPreview = env.VERCEL_ENV === 'preview';
    const media = mediaHostSources(env.MEDIA_IMAGE_HOSTS);

    /** @type {Record<string, Array<string | null | false>>} */
    const directives = {
        'default-src': ["'self'"],
        // 'unsafe-eval' only for the dev server's React and HMR runtime.
        'script-src': [
            "'self'",
            "'unsafe-inline'",
            isDev && "'unsafe-eval'",
            `${GOOGLE_IDENTITY}client`,
            'https://appleid.cdn-apple.com',
            isPreview && 'https://vercel.live',
        ],
        // Inline style attributes, Recharts and the QR print popup.
        'style-src': ["'self'", "'unsafe-inline'", `${GOOGLE_IDENTITY}style`, isPreview && 'https://vercel.live'],
        'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https://images.pexels.com',
            ...media,
            isPreview && 'https://vercel.live',
            isPreview && 'https://vercel.com',
        ],
        'media-src': ["'self'", 'blob:', ...media],
        'font-src': ["'self'", isPreview && 'https://vercel.live', isPreview && 'https://assets.vercel.com'],
        // The backend: API calls, the feed's event stream, crash reports.
        'connect-src': [
            "'self'",
            originOf(env.NEXT_PUBLIC_API_BASE_URL),
            GOOGLE_IDENTITY,
            isDev && 'ws:',
            isPreview && 'https://vercel.live',
            isPreview && 'wss://ws-us3.pusher.com',
        ],
        // Schedule maps, playlist previews, the Google sign-in button.
        'frame-src': [
            'https://www.google.com',
            'https://open.spotify.com',
            'https://www.youtube-nocookie.com',
            GOOGLE_IDENTITY,
            isPreview && 'https://vercel.live',
        ],
        'worker-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
    };

    return Object.fromEntries(
        Object.entries(directives).map(([name, sources]) => [name, [...new Set(sources.filter((source) => typeof source === 'string'))]]),
    );
}

/** @param {Record<string, string[]>} directives */
function serialize(directives) {
    return Object.entries(directives)
        .map(([name, sources]) => [name, ...sources].join(' '))
        .join('; ');
}

/** @param {Record<string, string | undefined>} env */
export function contentSecurityPolicy(env) {
    return serialize(pageDirectives(env));
}

/**
 * The policy on the demo's mock service worker itself. The worker passes every request it
 * doesn't mock on with its own fetch(), and a worker's fetch() answers to connect-src of the
 * worker's policy whatever the page asked for: a video the page's media-src allows is still
 * refused unless connect-src allows its origin too. So the worker can connect to every origin
 * a page may load from. It only ever repeats a request the page's own policy let through.
 *
 * @param {Record<string, string | undefined>} env
 */
export function workerContentSecurityPolicy(env) {
    const directives = pageDirectives(env);
    const loadable = ['connect-src', 'script-src', 'style-src', 'img-src', 'media-src', 'font-src'].flatMap((name) => directives[name]);
    // Keywords other than 'self' mean nothing to connect-src, and a worker never sees data: or blob: requests.
    const connectable = loadable.filter((source) => source === "'self'" || /^[a-z]+:\/\//.test(source) || source === 'ws:');
    return serialize({ ...directives, 'connect-src': [...new Set(connectable)] });
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Array<{ key: string, value: string }>}
 */
export function securityHeaders(env) {
    const headers = [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy(env) },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Not same-origin: Google and Apple sign-in and the QR print page are popups that must keep their opener.
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        // Camera and microphone (story capture) for this origin only, off for any frame; the
        // rest are features the app never uses. Autoplay, fullscreen and the like stay unset:
        // a self-only rule would stop the playlist embeds getting them through their allow attribute.
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()' },
    ];
    if (env.NODE_ENV === 'production') {
        headers.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' });
    }
    return headers;
}

/**
 * The rules for next.config.mjs's headers(). When two rules set the same header on a path,
 * Next sends the later one, so the second swaps in the worker's own policy.
 *
 * @param {Record<string, string | undefined>} env
 */
export function securityHeaderRules(env) {
    return [
        { source: '/:path*', headers: securityHeaders(env) },
        { source: MOCK_SERVICE_WORKER_PATH, headers: [{ key: 'Content-Security-Policy', value: workerContentSecurityPolicy(env) }] },
    ];
}
