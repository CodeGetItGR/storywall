'use client';

import { CalendarHeart } from 'lucide-react';
import Link from 'next/link';
import type { useTranslations } from 'next-intl';

import { routes } from '@/lib/routes';

interface ProfileEmptyStateProps {
    t: ReturnType<typeof useTranslations>;
}

export function ProfileEmptyState({ t }: ProfileEmptyStateProps) {
    return (
        <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 lg:pb-8">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-card px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
                    <CalendarHeart className="h-7 w-7 text-ink-faint" />
                </div>
                <h2 className="mb-1 text-base font-bold text-ink">{t('emptyMemberships.title')}</h2>
                <p className="mb-5 max-w-xs text-sm leading-relaxed text-ink-muted">{t('emptyMemberships.body')}</p>
                <Link
                    href={routes.events.new}
                    className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                    {t('emptyMemberships.cta')}
                </Link>
            </div>
        </div>
    );
}
