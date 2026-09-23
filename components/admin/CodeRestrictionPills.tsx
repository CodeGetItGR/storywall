'use client';

import { useTranslations } from 'next-intl';

import { useCodeRestrictionOptions } from '@/hooks/useCodeRestrictionOptions';
import type { CodeRestrictionsDto } from '@/lib/api/types';

const VISIBLE_PILLS = 3;

export function CodeRestrictionPills({ restrictions }: { restrictions: CodeRestrictionsDto }) {
    const t = useTranslations('AdminPage.collaborations.codes.restrictions');
    const { eventTypeLabel } = useCodeRestrictionOptions();
    const pills = [
        ...restrictions.eventTypeKeys.map((key) => ({ key: `type:${key}`, label: eventTypeLabel(key), mono: false })),
        ...restrictions.planTierCodes.map((code) => ({ key: `plan:${code}`, label: code, mono: true })),
    ];

    if (pills.length === 0) return <span className="text-xs text-ink-faint">{t('all')}</span>;

    const hiddenCount = pills.length - VISIBLE_PILLS;

    return (
        <div className="flex max-w-64 flex-wrap gap-1">
            {pills.slice(0, VISIBLE_PILLS).map((pill) => (
                <span
                    key={pill.key}
                    className={
                        pill.mono
                            ? 'rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink-muted'
                            : 'rounded-full bg-status-neutral-wash px-2 py-0.5 text-[11px] font-bold text-status-neutral'
                    }
                >
                    {pill.label}
                </span>
            ))}
            {hiddenCount > 0 && (
                <span className="px-1 py-0.5 text-[11px] font-bold text-ink-faint" title={pills.map((pill) => pill.label).join(', ')}>
                    {t('more', { count: hiddenCount })}
                </span>
            )}
        </div>
    );
}
