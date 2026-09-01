'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { routes } from '@/lib/routes';

export function HomeEmptyState() {
    const t = useTranslations('WelcomePage');

    return (
        <div className="flex min-h-[35vh] flex-col items-center justify-center gap-6 px-4 text-center">
            <div>
                <h2 className="text-xl font-bold text-ink">{t('title')}</h2>
                <p className="mt-2 max-w-xs text-sm text-ink-muted">{t('subtitle')}</p>
            </div>
            <Link href={routes.events.new()} className="group flex flex-col items-center gap-2">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand shadow-[0_10px_28px_rgba(255,122,89,0.28)] transition-transform group-hover:scale-105">
                    <Plus className="h-7 w-7 text-white" strokeWidth={2.2} />
                </span>
                <span className="text-sm font-semibold text-ink">{t('createEventCta')}</span>
            </Link>
        </div>
    );
}
