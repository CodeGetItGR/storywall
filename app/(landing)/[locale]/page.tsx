import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { LandingPage } from '@/components/landing/LandingPage';
import { defaultLocale, type Locale, locales } from '@/i18n/config';
import { getLandingMetadata } from '@/lib/landingMetadata';

type LocalePageProps = {
    params: Promise<{ locale: string }>;
};

function isSupportedLocale(locale: string): locale is Locale {
    return (locales as readonly string[]).includes(locale);
}

export function generateStaticParams() {
    return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
    const { locale } = await params;
    if (!isSupportedLocale(locale)) return {};
    return getLandingMetadata(locale);
}

export default async function LocalePage({ params }: LocalePageProps) {
    const { locale } = await params;

    // `/en` is a duplicate of `/`; a permanent redirect keeps crawlers on the canonical URL.
    if (locale === defaultLocale) permanentRedirect('/');
    if (!isSupportedLocale(locale)) notFound();

    return <LandingPage />;
}
