'use client';

import { useTranslations } from 'next-intl';

export function CampaignSourcePicker({
    value,
    options,
    onChangeAction,
}: {
    value: string | null;
    options: string[];
    onChangeAction: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
    const t = useTranslations('AdminPage.campaignOverview.source');

    return (
        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
            {t('label')}
            <select
                value={value ?? ''}
                onChange={onChangeAction}
                className="min-h-10 min-w-48 rounded-lg border border-border bg-card px-3 font-mono text-sm text-ink"
            >
                <option value="">{t('all')}</option>
                {options.map((source) => (
                    <option key={source} value={source}>
                        {source}
                    </option>
                ))}
            </select>
        </label>
    );
}
