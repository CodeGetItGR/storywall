import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getInvitationCataloguePath, getInvitationThemePath, getPublicLandingPath } from '@/i18n/publicLocale';
import { type InvitationThemeCardDto, type InvitationThemePage, themeSeoCopy, themeShareImage } from '@/lib/invitation/themeCatalogue';
import {
    absoluteUrl,
    buildIndexableMetadata,
    invitationCatalogueLanguageAlternates,
    invitationThemeLanguageAlternates,
    OG_IMAGE_PATH,
} from '@/lib/seo';

// The catalogue shares the site's default OG image.
export async function getThemeCatalogueMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'SaveMyDateStorefront.catalogue' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildIndexableMetadata({
        locale,
        path: getInvitationCataloguePath(locale),
        languages: invitationCatalogueLanguageAlternates(),
        imagePath: OG_IMAGE_PATH,
        copy: { title: t('metaTitle'), description: t('metaDescription'), siteName: landing('siteName'), imageAlt: t('heading') },
    });
}

// A theme page's title and description in its language: the admin's own on the Greek page when set.
export async function themePageCopy(theme: InvitationThemePage, locale: Locale): Promise<{ title: string; description: string }> {
    const t = await getTranslations({ locale, namespace: 'SaveMyDateStorefront.theme' });
    return themeSeoCopy(theme, locale, {
        title: t('metaTitle', { name: theme.name, eventType: theme.eventType }),
        description: t('metaDescription', { name: theme.name }),
    });
}

// A theme page's share image is its own (the admin's pick, else its first photo), or the site's default.
export async function getThemePageMetadata(theme: InvitationThemePage, locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'SaveMyDateStorefront' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    const copy = await themePageCopy(theme, locale);
    const image = themeShareImage(theme);
    const imageAlt = t('catalogue.cardAlt', { name: theme.name });
    const metadata = buildIndexableMetadata({
        locale,
        path: getInvitationThemePath(theme.slug, locale),
        languages: invitationThemeLanguageAlternates(theme.slug),
        imagePath: image ? undefined : OG_IMAGE_PATH,
        copy: { ...copy, siteName: landing('siteName'), imageAlt },
    });
    if (!image) return metadata;
    return {
        ...metadata,
        openGraph: { ...metadata.openGraph, images: [{ url: image, alt: imageAlt }] },
        twitter: { ...metadata.twitter, images: [image] },
    };
}

type Crumb = { name: string; item: string };

function breadcrumbList(id: string, crumbs: Crumb[]) {
    return {
        '@type': 'BreadcrumbList',
        '@id': id,
        itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
    };
}

// JSON-LD for the catalogue: its breadcrumb, and every theme as an item list.
export async function themeCatalogueStructuredData(themes: readonly InvitationThemeCardDto[], locale: Locale) {
    const t = await getTranslations({ locale, namespace: 'SaveMyDateStorefront' });
    const url = absoluteUrl(getInvitationCataloguePath(locale));
    return {
        '@context': 'https://schema.org',
        '@graph': [
            breadcrumbList(`${url}#breadcrumb`, [
                { name: t('home'), item: absoluteUrl(getPublicLandingPath(locale)) },
                { name: t('catalogue.heading'), item: url },
            ]),
            {
                '@type': 'ItemList',
                '@id': `${url}#themes`,
                name: t('catalogue.heading'),
                itemListElement: themes.map((theme, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: theme.name,
                    url: absoluteUrl(getInvitationThemePath(theme.slug, locale)),
                })),
            },
        ],
    };
}

// JSON-LD for a theme page: the theme as a Product, and its breadcrumb. No offer until plans carry a
// price for invitations (KAN-81).
export async function themePageStructuredData(theme: InvitationThemePage, locale: Locale) {
    const t = await getTranslations({ locale, namespace: 'SaveMyDateStorefront' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    const copy = await themePageCopy(theme, locale);
    const url = absoluteUrl(getInvitationThemePath(theme.slug, locale));
    const images = [...new Set([theme.ogImageUrl, ...theme.photos.map((photo) => photo.url)].filter((value): value is string => Boolean(value)))];
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Product',
                '@id': `${url}#product`,
                name: theme.name,
                description: copy.description,
                sku: theme.slug,
                url,
                brand: { '@type': 'Brand', name: landing('siteName') },
                ...(images.length > 0 && { image: images }),
            },
            breadcrumbList(`${url}#breadcrumb`, [
                { name: t('home'), item: absoluteUrl(getPublicLandingPath(locale)) },
                { name: t('catalogue.heading'), item: absoluteUrl(getInvitationCataloguePath(locale)) },
                { name: theme.name, item: url },
            ]),
        ],
    };
}
