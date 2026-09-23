'use client';

import { HeartCrack } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';

// Shown in place of the feed when /feed/[eventId] doesn't resolve to a real
// event — bad link, typo, or an event that's since been removed. Kept warm
// and non-technical on purpose; the person hitting this is a wedding guest,
// not a developer.
export function EventNotFound() {
    const t = useTranslations('EventNotFound');
    const { isAuthenticated } = useAuth();
    const href = isAuthenticated ? routes.home : routes.login;
    const cta = isAuthenticated ? t('ctaAuthenticated') : t('ctaGuest');

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand">
                <HeartCrack className="h-7 w-7 text-white" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-balance text-ink lg:text-3xl">{t('title')}</h1>
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-ink-muted">{t('description')}</p>
            <Link
                href={href}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
            >
                {cta}
            </Link>
        </div>
    );
}
