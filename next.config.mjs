import { execSync } from 'node:child_process';

import createNextIntlPlugin from 'next-intl/plugin';

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
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.r2.dev',
            },
            ...resolveMediaHostPatterns(),
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
        ],
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

export default withNextIntl(nextConfig);
