import { execSync } from 'node:child_process';

import { withSentryConfig } from '@sentry/nextjs/config';
import createNextIntlPlugin from 'next-intl/plugin';

import { securityHeaderRules } from './lib/security/securityHeaders.mjs';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// The build's commit, sent as appVersion on bug and crash reports. Vercel
// provides it; a local build asks git; neither leaves it empty (sent as null).
function resolveAppVersion() {
    if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
    try {
        return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        return '';
    }
}

// Hosts the backend's media URLs are served from, comma-separated — for R2,
// "<account-id>.r2.cloudflarestorage.com". Each one is allowed bare and with
// any subdomain, since presigned URLs can put the bucket in the hostname.
// Read at build time: changing it means a rebuild. A production build without
// it fails, rather than shipping a site whose every media image 400s.
function resolveMediaHostPatterns() {
    const hosts = (process.env.MEDIA_IMAGE_HOSTS ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean);
    if (hosts.length === 0 && process.env.VERCEL_ENV === 'production') {
        throw new Error('MEDIA_IMAGE_HOSTS is not set; next/image would reject every media URL.');
    }
    return hosts.flatMap((host) => [
        { protocol: 'https', hostname: host },
        { protocol: 'https', hostname: `**.${host}` },
    ]);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
        // Sentry's environment tag: "staging" on the staging deployment, else Vercel's environment.
        NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV || 'development',
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    poweredByHeader: false,
    async headers() {
        return securityHeaderRules(process.env);
    },
    images: {
        // Set to "1" on a deployment to turn the optimizer off app-wide (e.g. staging, to avoid
        // optimizer-quota spend). Read at build time, so a change needs a redeploy.
        unoptimized: process.env.DISABLE_IMAGE_OPTIMIZATION === '1',
        // Every pattern here is a source our image optimizer will fetch and resize,
        // billed to us, for anyone who asks. No wildcard a stranger can host under:
        // "**.r2.dev" let any R2 bucket in the world through.
        remotePatterns: resolveMediaHostPatterns(),
        formats: ['image/webp'],
        minimumCacheTTL: 2678400,
        qualities: [75],
    },
    reactCompiler: true,
    experimental: {
        // Keep a visited page for 30s so going back to it, or opening it again,
        // doesn't wait on the server. Signing in or out drops these pages (see
        // resetSessionCaches in providers/AuthProvider.tsx).
        staleTimes: {
            dynamic: 30,
        },
    },
};

export default withSentryConfig(withNextIntl(nextConfig), {
    org: 'storywall',
    project: 'storywall-web',
    // Uploads source maps when set (the Vercel build); without it the build skips the upload.
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    // Browser events go through this route on our own domain, so ad blockers and the CSP let them through.
    // proxy.ts leaves it out of its matcher.
    tunnelRoute: '/monitoring',
    telemetry: false,
});
