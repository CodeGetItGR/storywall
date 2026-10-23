import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { LandingPage } from '@/components/landing/LandingPage';
import { OccasionPage } from '@/components/occasions/OccasionPage';
import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getLandingMetadata } from '@/lib/landingMetadata';
import { getOccasionMetadata } from '@/lib/occasionMetadata';
import { findReadyOccasion } from '@/lib/occasions/occasions';

// One segment for two kinds of page: `/el` (a locale's landing) and `/weddings` (an English
// occasion page). Next.js allows only one dynamic segment name per level.
type SlugPageProps = {
    params: Promise<{ slug: string }>;
};

function isSupportedLocale(slug: string): slug is Locale {
    return (locales as readonly string[]).includes(slug);
}

export function generateStaticParams() {
    return locales.filter((locale) => locale !== defaultLocale).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
    const { slug } = await params;
    if (isSupportedLocale(slug)) return slug === defaultLocale ? {} : getLandingMetadata(slug);
    const occasion = findReadyOccasion(defaultLocale, slug);
    return occasion ? getOccasionMetadata(occasion, defaultLocale) : {};
}

export default async function SlugPage({ params }: SlugPageProps) {
    const { slug } = await params;

    // `/en` is a duplicate of `/`; a permanent redirect keeps crawlers on the canonical URL.
    if (slug === defaultLocale) permanentRedirect('/');
    if (isSupportedLocale(slug)) return <LandingPage />;

    const occasion = findReadyOccasion(defaultLocale, slug);
    if (!occasion) notFound();
    return <OccasionPage locale={defaultLocale} occasion={occasion} />;
}
