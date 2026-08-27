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
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center mb-6">
                <HeartCrack className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-ink mb-3 text-balance">{t('title')}</h1>
            <p className="text-sm text-ink-muted max-w-sm mb-8 leading-relaxed">{t('description')}</p>
            <Link
                href={href}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
                {cta}
            </Link>
        </div>
    );
}
