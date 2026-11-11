import { StorefrontPageFrame } from '@/components/saveMyDate/storefront/StorefrontPageFrame';
import { ThemeCatalogue } from '@/components/saveMyDate/storefront/ThemeCatalogue';
import type { Locale } from '@/i18n/config';
import { getInvitationCataloguePath, INVITATION_CATALOGUE_PATHS } from '@/i18n/publicLocale';
import { fetchThemeCatalogue } from '@/lib/invitation/serverThemeCatalogue';
import { type CatalogueSearchParams, invitationThemeKeys, readCatalogueFilters } from '@/lib/invitation/themeCatalogue';
import { themeCatalogueStructuredData } from '@/lib/invitation/themeCatalogueMetadata';
import { makeQueryClient } from '@/lib/queryClient';

type ThemeCataloguePageProps = { locale: Locale; searchParams: CatalogueSearchParams };

// The catalogue in one language, its themes fetched on the server so its cards are in the first HTML.
export async function ThemeCataloguePage({ locale, searchParams }: ThemeCataloguePageProps) {
    const queryClient = makeQueryClient();
    let structuredData: unknown = null;

    try {
        const themes = await fetchThemeCatalogue();
        queryClient.setQueryData(invitationThemeKeys.catalogue(), themes);
        structuredData = await themeCatalogueStructuredData(themes, locale);
    } catch {
        // The catalogue fetches them in the browser, with its own loading and error states.
    }

    return (
        <StorefrontPageFrame alternatePaths={INVITATION_CATALOGUE_PATHS} locale={locale} queryClient={queryClient} structuredData={structuredData}>
            <ThemeCatalogue initialFilters={readCatalogueFilters(searchParams)} path={getInvitationCataloguePath(locale)} />
        </StorefrontPageFrame>
    );
}
