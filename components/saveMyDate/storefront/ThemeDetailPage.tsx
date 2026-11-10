import { notFound } from 'next/navigation';

import { StorefrontPageFrame } from '@/components/saveMyDate/storefront/StorefrontPageFrame';
import { ThemePageView } from '@/components/saveMyDate/storefront/ThemePageView';
import { type Locale, locales } from '@/i18n/config';
import { getInvitationThemePath } from '@/i18n/publicLocale';
import { fetchThemePage } from '@/lib/invitation/serverThemeCatalogue';
import { invitationThemeKeys,type InvitationThemePage } from '@/lib/invitation/themeCatalogue';
import { themePageStructuredData } from '@/lib/invitation/themeCatalogueMetadata';
import { makeQueryClient } from '@/lib/queryClient';

type ThemeDetailPageProps = { locale: Locale; slug: string };

// One theme's page in one language, fetched on the server so its name and photos are in the first HTML.
// 404s when no active theme has this slug.
export async function ThemeDetailPage({ locale, slug }: ThemeDetailPageProps) {
    // Undefined when the backend failed: the page then fetches the theme in the browser.
    let theme: InvitationThemePage | null | undefined;
    try {
        theme = await fetchThemePage(slug);
    } catch {
        theme = undefined;
    }
    if (theme === null) notFound();

    const queryClient = makeQueryClient();
    if (theme) queryClient.setQueryData(invitationThemeKeys.page(slug), theme);
    const structuredData = theme ? await themePageStructuredData(theme, locale) : null;
    const alternatePaths = Object.fromEntries(locales.map((other) => [other, getInvitationThemePath(slug, other)])) as Record<Locale, string>;

    return (
        <StorefrontPageFrame alternatePaths={alternatePaths} locale={locale} queryClient={queryClient} structuredData={structuredData}>
            <ThemePageView slug={slug} />
        </StorefrontPageFrame>
    );
}
