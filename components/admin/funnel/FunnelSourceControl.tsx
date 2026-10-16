'use client';

import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import type { useFunnelSource } from '@/hooks/useFunnelSource';

const LABEL = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function FunnelSourceControl({ source }: { source: ReturnType<typeof useFunnelSource> }) {
    const t = useTranslations('AdminPage.funnel.source');

    return (
        <label className="flex flex-col gap-0.5">
            <span className={LABEL}>{t('label')}</span>
            <select value={source.channel ?? ''} onChange={source.handleChange} className={adminInputClass('w-56')}>
                <option value="">{t('all')}</option>
                {source.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
