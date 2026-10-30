'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { BackButton } from '@/components/ui/BackButton';
import { routes } from '@/lib/routes';

// The page around the partner report and its skeleton: the back link and one centered column.
export function PartnerPortalFrame({ children }: { children: ReactNode }) {
    const t = useTranslations('PartnerPortalPage');

    return (
        <main className="min-h-dvh bg-background px-4 py-6 text-ink sm:px-6 sm:py-10">
            <div className="mx-auto w-full max-w-3xl">
                {/* Back */}
                <BackButton href={routes.profile} label={t('back')} historyBack className="mb-5" />

                {children}
            </div>
        </main>
    );
}
