import type { Metadata, Viewport } from 'next';
import { getTranslations } from 'next-intl/server';

import { isStagingSite, SITE_URL, STAGING_NO_INDEX } from '@/lib/seo';

// Shared by both root layouts, app/(landing) and app/(main).
export const rootViewport: Viewport = {
    colorScheme: 'only light',
    themeColor: '#fffaf3',
    width: 'device-width',
    initialScale: 1,
    interactiveWidget: 'resizes-content',
};

// Icons come from app/favicon.ico, app/icon.svg and app/apple-icon.png.
export async function getRootMetadata(): Promise<Metadata> {
    const t = await getTranslations('RootLayout');
    return {
        metadataBase: new URL(SITE_URL),
        title: t('title'),
        description: t('description'),
        // Pages with their own robots replace this; buildIndexableMetadata does the same on staging.
        ...(isStagingSite() && { robots: STAGING_NO_INDEX }),
    };
}
