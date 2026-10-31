'use client';

import { ChevronRight, Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { useMe } from '@/hooks/useMe';
import { routes } from '@/lib/routes';

// Only for accounts matched to a partner: a link to their partner page.
export function ProfilePartnerSection() {
    const t = useTranslations('ProfilePage.partner');
    const { data: me } = useMe();

    if (!me?.partner) return null;

    return (
        <section className="rounded-[1.5rem] bg-card shadow-[0_18px_48px_rgba(35,28,22,0.08)]">
            {/* Partner page link */}
            <AppLink href={routes.partner} className="flex min-h-14 items-center gap-2 p-4 sm:p-5">
                <Handshake className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="flex-1 text-base font-semibold text-ink">{t('title')}</span>
                <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            </AppLink>
        </section>
    );
}
