'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { FunnelBreakdown } from '@/components/admin/funnel/FunnelBreakdown';
import { FunnelFigures } from '@/components/admin/funnel/FunnelFigures';
import { FunnelGroup } from '@/components/admin/funnel/FunnelGroup';
import { useFunnelFormat } from '@/hooks/useFunnelFormat';
import { locales } from '@/i18n/config';
import { funnelBreakdown, SIGNUP_PROVIDERS } from '@/lib/adminFunnel';
import type { FunnelMetricsResponseDto } from '@/lib/api/types';

export function FunnelAccounts({ accounts }: { accounts: FunnelMetricsResponseDto['accounts'] }) {
    const t = useTranslations('AdminPage.funnel.accounts');
    const format = useFunnelFormat();
    const providerRows = useMemo(() => funnelBreakdown(accounts.signedUpByProvider, SIGNUP_PROVIDERS), [accounts.signedUpByProvider]);
    const providerLabels = useMemo(() => Object.fromEntries(SIGNUP_PROVIDERS.map((key) => [key, t(`providers.${key}`)])), [t]);
    const localeRows = useMemo(() => funnelBreakdown(accounts.byLocale, locales), [accounts.byLocale]);
    const localeLabels = useMemo(() => Object.fromEntries(locales.map((key) => [key, t(`locales.${key}`)])), [t]);

    return (
        <FunnelGroup title={t('title')} window="signup">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Sign-up method */}
                <FunnelBreakdown title={t('byProvider')} rows={providerRows} labels={providerLabels} />

                {/* Language */}
                <FunnelBreakdown title={t('byLocale')} rows={localeRows} labels={localeLabels} />
            </div>

            {/* Status */}
            <FunnelFigures
                className="mt-6 lg:grid-cols-4"
                figures={[
                    { key: 'suspended', label: t('suspended'), value: format.count(accounts.suspended) },
                    { key: 'deleted', label: t('deleted'), value: format.count(accounts.deleted) },
                ]}
            />
        </FunnelGroup>
    );
}
