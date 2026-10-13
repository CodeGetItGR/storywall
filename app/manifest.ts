import type { MetadataRoute } from 'next';

import { routes } from '@/lib/routes';

// Makes the app installable. The installed app opens on the signed-in home.
export default function manifest(): MetadataRoute.Manifest {
    return {
        id: routes.feed,
        name: 'StoryWall',
        short_name: 'StoryWall',
        start_url: routes.feed,
        scope: '/',
        display: 'standalone',
        background_color: '#fffaf3',
        theme_color: '#fffaf3',
        icons: [
            { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
