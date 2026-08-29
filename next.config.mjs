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
        ],
        formats: ['image/webp'],
        minimumCacheTTL: 2678400,
        qualities: [75],
    },
    reactCompiler: true,
};

export default withNextIntl(nextConfig);
