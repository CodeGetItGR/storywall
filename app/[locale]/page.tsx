import { notFound, redirect } from 'next/navigation';

import { LandingPage } from '@/components/landing/LandingPage';
import { defaultLocale, locales } from '@/i18n/config';

type LocalePageProps = {
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ locale }));
}

export default async function LocalePage({ params }: LocalePageProps) {
    const { locale } = await params;

    if (locale === defaultLocale) redirect('/');
    if (!(locales as readonly string[]).includes(locale)) notFound();

    return <LandingPage />;
}
