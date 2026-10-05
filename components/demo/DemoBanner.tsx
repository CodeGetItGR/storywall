'use client';

import { useLocale, useTranslations } from 'next-intl';

import { ResetDemoButton } from '@/components/demo/ResetDemoButton';
import { BackButton } from '@/components/ui/BackButton';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

export function DemoBanner({ onResetAction }: { onResetAction: () => void }) {
    const t = useTranslations('Demo');
    const locale = useLocale() as Locale;

    return (
        <header className="flex items-center gap-2 bg-surface-muted px-2 py-1">
            {/* Exit */}
            <BackButton href={getPublicLandingPath(locale)} label={t('exitDemo')} variant="icon" className="hover:bg-background" />
            {/* Title */}
            <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-ink">{t('title')}</p>
            {/* Reset */}
            <ResetDemoButton onResetAction={onResetAction} />
        </header>
    );
}
