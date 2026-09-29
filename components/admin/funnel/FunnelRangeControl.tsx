'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import type { useFunnelRange } from '@/hooks/useFunnelRange';
import { FUNNEL_RANGE_PRESETS } from '@/lib/adminFunnel';

const dateInputClass = 'min-h-10 rounded-lg border border-border bg-card px-3 text-sm text-ink';

export function FunnelRangeControl({ range }: { range: ReturnType<typeof useFunnelRange> }) {
    const t = useTranslations('AdminPage.funnel.range');
    const options = useMemo(() => FUNNEL_RANGE_PRESETS.map((preset) => ({ value: preset, label: t(preset) })), [t]);

    return (
        <div className="space-y-3">
            {/* Presets */}
            <FunnelSegmented label={t('label')} options={options} value={range.preset} onChangeAction={range.setPreset} />

            {/* Custom dates */}
            {range.preset === 'CUSTOM' && (
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
                        {t('from')}
                        <input type="date" value={range.custom.from} max={range.custom.to || range.today} onChange={range.handleFromChange} className={dateInputClass} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
                        {t('to')}
                        <input type="date" value={range.custom.to} min={range.custom.from || undefined} onChange={range.handleToChange} className={dateInputClass} />
                    </label>
                </div>
            )}
            {!range.bounds.isValid && <p className="text-sm text-status-danger">{t('invalid')}</p>}

            {/* The two windows */}
            <p className="max-w-3xl text-sm leading-6 text-ink-muted">{t('windows')}</p>
        </div>
    );
}
