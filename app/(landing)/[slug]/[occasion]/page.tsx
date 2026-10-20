import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { OccasionPage } from '@/components/occasions/OccasionPage';
import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getQrWeddingPath } from '@/i18n/publicLocale';
import { getOccasionMetadata } from '@/lib/occasionMetadata';
import { findReadyOccasion, type Occasion, occasionPath } from '@/lib/occasions/occasions';

// `/el/gamos`: an occasion page in a non-default locale.
type LocalizedOccasionPageProps = {
    params: Promise<{ slug: string; occasion: string }>;
};

function resolve(slug: string, occasionSlug: string): { locale: Locale; occasion: Occasion } | null {
    const locale = locales.find((candidate) => candidate === slug && candidate !== defaultLocale);
    if (!locale) return null;
    const occasion = findReadyOccasion(locale, occasionSlug);
    return occasion ? { locale, occasion } : null;
}

export async function generateMetadata({ params }: LocalizedOccasionPageProps): Promise<Metadata> {
    const { slug, occasion } = await params;
    const resolved = resolve(slug, occasion);
    return resolved ? getOccasionMetadata(resolved.occasion, resolved.locale) : {};
}

export default async function LocalizedOccasionPage({ params }: LocalizedOccasionPageProps) {
    const { slug, occasion } = await params;
    const resolved = resolve(slug, occasion);
    if (!resolved) {
        // `/en/weddings` → `/weddings`, as `/en` → `/`.
        const english = slug === defaultLocale ? findReadyOccasion(defaultLocale, occasion) : null;
        if (english) permanentRedirect(occasionPath(english, defaultLocale));
        // `/en/wedding-qr-code` → `/wedding-qr-code`.
        const qrWeddingPath = getQrWeddingPath(defaultLocale);
        if (slug === defaultLocale && `/${occasion}` === qrWeddingPath) permanentRedirect(qrWeddingPath);
        notFound();
    }
    return <OccasionPage locale={resolved.locale} occasion={resolved.occasion} />;
}
