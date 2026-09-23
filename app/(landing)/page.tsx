import type { Metadata } from 'next';

import { LandingPage } from '@/components/landing/LandingPage';
import { defaultLocale } from '@/i18n/config';
import { getLandingMetadata } from '@/lib/landingMetadata';

export function generateMetadata(): Promise<Metadata> {
    return getLandingMetadata(defaultLocale);
}

export default function Page() {
    return <LandingPage />;
}
