import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.r2.dev',
            },
            {
                protocol: 'https',
                hostname: '71ade89bbcb4e06fa046d831464581b0.r2.cloudflarestorage.com',
            },
            {
                protocol: 'https',
                hostname: '**.71ade89bbcb4e06fa046d831464581b0.r2.cloudflarestorage.com',
            },
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
