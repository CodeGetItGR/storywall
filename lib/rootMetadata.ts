import type { Metadata, Viewport } from 'next';
import { getTranslations } from 'next-intl/server';

// Shared by both root layouts, app/(landing) and app/(main).
export const rootViewport: Viewport = {
    colorScheme: 'light',
    themeColor: '#fffaf3',
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-content',
};

export async function getRootMetadata(): Promise<Metadata> {
    const t = await getTranslations('RootLayout');
    return {
        title: t('title'),
        description: t('description'),
        icons: {
            icon: [
                { url: '/assets/Logo.svg', media: '(prefers-color-scheme: light)' },
                { url: '/assets/Logo.svg', media: '(prefers-color-scheme: dark)' },
                { url: '/assets/Logo.svg', type: 'image/svg+xml' },
            ],
            apple: '/assets/Logo.svg',
        },
    };
}
