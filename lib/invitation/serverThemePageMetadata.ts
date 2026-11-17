import type { Metadata } from 'next';

import type { Locale } from '@/i18n/config';
import { fetchThemePage } from '@/lib/invitation/serverThemeCatalogue';
import { getThemePageMetadata } from '@/lib/invitation/themeCatalogueMetadata';

// Server-only: a theme page's metadata. Empty when the theme is missing (the page 404s) or the backend
// failed (the page still renders and fetches the theme in the browser).
export async function themePageMetadata(slug: string, locale: Locale): Promise<Metadata> {
    try {
        const theme = await fetchThemePage(slug);
        return theme ? await getThemePageMetadata(theme, locale) : {};
    } catch {
        return {};
    }
}
