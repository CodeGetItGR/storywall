// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
    contentSecurityPolicy,
    mediaHostSources,
    MOCK_SERVICE_WORKER_PATH,
    securityHeaderRules,
    securityHeaders,
    workerContentSecurityPolicy,
} from './securityHeaders.mjs';

const PRODUCTION = {
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    NEXT_PUBLIC_API_BASE_URL: 'https://api.storywall.test/some/path',
    MEDIA_IMAGE_HOSTS: 'acct.r2.cloudflarestorage.com, media.storywall.test',
};

function parse(policy: string): Map<string, string[]> {
    return new Map(
        policy.split('; ').map((directive) => {
            const [name, ...sources] = directive.split(' ');
            return [name, sources];
        }),
    );
}

function directives(env: Record<string, string | undefined>): Map<string, string[]> {
    return parse(contentSecurityPolicy(env));
}

function header(env: Record<string, string | undefined>, key: string): string | undefined {
    return securityHeaders(env).find((h) => h.key === key)?.value;
}

describe('contentSecurityPolicy', () => {
    it('locks down everything with no use for an outside origin', () => {
        const csp = directives(PRODUCTION);
        expect(csp.get('default-src')).toEqual(["'self'"]);
        expect(csp.get('object-src')).toEqual(["'none'"]);
        expect(csp.get('base-uri')).toEqual(["'self'"]);
        expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
        expect(csp.get('form-action')).toEqual(["'self'"]);
        expect(csp.get('worker-src')).toEqual(["'self'"]);
        expect(csp.get('font-src')).toEqual(["'self'"]);
    });

    it('allows the backend origin, without its path, for API calls and the event stream', () => {
        expect(directives(PRODUCTION).get('connect-src')).toEqual(["'self'", 'https://api.storywall.test', 'https://accounts.google.com/gsi/']);
    });

    it('allows every media host, bare and with any subdomain, for images and video', () => {
        const csp = directives(PRODUCTION);
        for (const directive of ['img-src', 'media-src']) {
            expect(csp.get(directive)).toEqual(
                expect.arrayContaining([
                    'https://acct.r2.cloudflarestorage.com',
                    'https://*.acct.r2.cloudflarestorage.com',
                    'https://media.storywall.test',
                    'https://*.media.storywall.test',
                ]),
            );
        }
        expect(csp.get('img-src')).toEqual(expect.arrayContaining(["'self'", 'data:', 'blob:', 'https://images.pexels.com']));
        expect(csp.get('media-src')).toEqual(expect.arrayContaining(["'self'", 'blob:']));
    });

    it('allows the sign-in SDKs and the embeds the app shows', () => {
        const csp = directives(PRODUCTION);
        expect(csp.get('script-src')).toEqual([
            "'self'",
            "'unsafe-inline'",
            'https://accounts.google.com/gsi/client',
            'https://appleid.cdn-apple.com',
        ]);
        expect(csp.get('style-src')).toEqual(["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style']);
        expect(csp.get('frame-src')).toEqual([
            'https://www.google.com',
            'https://open.spotify.com',
            'https://www.youtube-nocookie.com',
            'https://accounts.google.com/gsi/',
        ]);
    });

    it('never allows eval or the dev server socket in production', () => {
        const policy = contentSecurityPolicy(PRODUCTION);
        expect(policy).not.toContain('unsafe-eval');
        expect(policy).not.toContain('ws:');
    });

    it('allows eval and the HMR socket on the dev server', () => {
        const csp = directives({ ...PRODUCTION, NODE_ENV: 'development' });
        expect(csp.get('script-src')).toContain("'unsafe-eval'");
        expect(csp.get('connect-src')).toContain('ws:');
    });

    it('allows the Vercel toolbar on preview deployments only', () => {
        expect(contentSecurityPolicy(PRODUCTION)).not.toContain('vercel.live');

        const csp = directives({ ...PRODUCTION, VERCEL_ENV: 'preview' });
        for (const directive of ['script-src', 'style-src', 'img-src', 'font-src', 'connect-src', 'frame-src']) {
            expect(csp.get(directive)).toContain('https://vercel.live');
        }
        expect(csp.get('script-src')).not.toContain("'unsafe-eval'");
    });

    it('leaves out an API origin or media hosts that are not set', () => {
        const csp = directives({ NODE_ENV: 'production' });
        expect(csp.get('connect-src')).toEqual(["'self'", 'https://accounts.google.com/gsi/']);
        expect(csp.get('media-src')).toEqual(["'self'", 'blob:']);
    });

    it('allows Google Ads origins only when the tag id is set', () => {
        expect(contentSecurityPolicy(PRODUCTION)).not.toContain('googletagmanager');

        const csp = directives({ ...PRODUCTION, NEXT_PUBLIC_GOOGLE_ADS_ID: 'AW-1' });
        expect(csp.get('script-src')).toEqual(
            expect.arrayContaining([
                'https://www.googletagmanager.com',
                'https://www.googleadservices.com',
                'https://www.google.com',
                'https://googleads.g.doubleclick.net',
            ]),
        );
        for (const directive of ['img-src', 'connect-src']) {
            expect(csp.get(directive)).toEqual(
                expect.arrayContaining(['https://googleads.g.doubleclick.net', 'https://www.google.gr', 'https://www.google.com.cy']),
            );
        }
        expect(csp.get('connect-src')).toContain('https://ad.doubleclick.net');
        expect(csp.get('frame-src')).toContain('https://www.googletagmanager.com');
    });

    it('is one header line', () => {
        expect(contentSecurityPolicy(PRODUCTION)).not.toMatch(/[\r\n]/);
    });
});

// With the demo running, its mock service worker re-fetches the page's requests itself, and a
// worker's fetch() is checked against connect-src only.
describe('workerContentSecurityPolicy', () => {
    it('lets the worker connect to every origin a page may load from', () => {
        const connect = parse(workerContentSecurityPolicy(PRODUCTION)).get('connect-src');
        expect(connect).toEqual(
            expect.arrayContaining([
                "'self'",
                'https://api.storywall.test',
                'https://accounts.google.com/gsi/',
                'https://accounts.google.com/gsi/client',
                'https://appleid.cdn-apple.com',
                'https://images.pexels.com',
                'https://acct.r2.cloudflarestorage.com',
                'https://*.acct.r2.cloudflarestorage.com',
            ]),
        );
        expect(connect).not.toContain("'unsafe-inline'");
        expect(connect).not.toContain('data:');
        expect(connect).not.toContain('blob:');
    });

    it('matches the page policy everywhere but connect-src', () => {
        const page = directives(PRODUCTION);
        const worker = parse(workerContentSecurityPolicy(PRODUCTION));
        page.delete('connect-src');
        worker.delete('connect-src');
        expect(worker).toEqual(page);
    });
});

describe('securityHeaderRules', () => {
    it('sends the headers everywhere, then gives the mock worker its own policy', () => {
        const [all, worker] = securityHeaderRules(PRODUCTION);
        expect(all).toEqual({ source: '/:path*', headers: securityHeaders(PRODUCTION) });
        // Later rules win, so this one must come after the catch-all.
        expect(worker).toEqual({
            source: MOCK_SERVICE_WORKER_PATH,
            headers: [{ key: 'Content-Security-Policy', value: workerContentSecurityPolicy(PRODUCTION) }],
        });
        expect(MOCK_SERVICE_WORKER_PATH).toBe('/mockServiceWorker.js');
    });
});

describe('mediaHostSources', () => {
    it('ignores blanks and whitespace', () => {
        expect(mediaHostSources(' a.test , ,b.test ')).toEqual(['https://a.test', 'https://*.a.test', 'https://b.test', 'https://*.b.test']);
        expect(mediaHostSources(undefined)).toEqual([]);
    });
});

describe('securityHeaders', () => {
    it('sends the fixed hardening headers', () => {
        expect(header(PRODUCTION, 'X-Frame-Options')).toBe('DENY');
        expect(header(PRODUCTION, 'X-Content-Type-Options')).toBe('nosniff');
        expect(header(PRODUCTION, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
        // same-origin would cut off the sign-in and QR print popups.
        expect(header(PRODUCTION, 'Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
        expect(header(PRODUCTION, 'Content-Security-Policy')).toBe(contentSecurityPolicy(PRODUCTION));
    });

    it('keeps camera and microphone for this origin and leaves embed features alone', () => {
        const policy = header(PRODUCTION, 'Permissions-Policy');
        expect(policy).toBe('camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()');
        // A self-only rule for these would break the playlist iframes' allow attribute.
        for (const feature of ['autoplay', 'encrypted-media', 'fullscreen', 'picture-in-picture', 'clipboard-write']) {
            expect(policy).not.toContain(feature);
        }
    });

    it('sends HSTS from production builds only', () => {
        expect(header(PRODUCTION, 'Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
        expect(header({ ...PRODUCTION, NODE_ENV: 'development' }, 'Strict-Transport-Security')).toBeUndefined();
    });
});
