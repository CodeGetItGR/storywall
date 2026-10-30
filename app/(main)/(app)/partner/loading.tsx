'use client';

import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/ui/LoadingState';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    const t = useTranslations('PartnerPortalPage');

    return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-6">
            <LoadingState label={t('loading')} />
        </main>
    );
}
