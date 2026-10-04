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
        <div role="status" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-surface-muted px-4 py-2">
            {/* Exit */}
            <BackButton href={getPublicLandingPath(locale)} label={t('exitDemo')} className="flex-none" />
            {/* Notice */}
            <p className="order-last basis-full pb-1 text-xs font-semibold text-ink sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto sm:pb-0">
                {t('banner')}
            </p>
            <ResetDemoButton onResetAction={onResetAction} />
        </div>
    );
}
