'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ComponentType, useCallback } from 'react';

import type { EventModuleRow as EventModuleRowData } from '@/lib/adminEvents';
import { formatAdminDate } from '@/lib/adminOrders';
import { cn } from '@/lib/utils';

const SOURCE_STYLES: Record<EventModuleRowData['source'], string> = {
    PLAN: 'bg-surface-muted text-ink-muted',
    ADDON: 'bg-status-good-wash text-status-good',
    ADMIN_GRANT: 'border border-ink/15 bg-card text-ink',
    NONE: '',
};

// One module: what it is, where it comes from, and the admin grant's reason when there is one.
export function EventModuleRow({
    row,
    name,
    Icon,
    editable,
    onGrantAction,
    onRevokeAction,
}: {
    row: EventModuleRowData;
    name: string;
    Icon: ComponentType<{ className?: string }>;
    editable: boolean;
    onGrantAction: (moduleKey: string) => void;
    onRevokeAction: (moduleKey: string) => void;
}) {
    const t = useTranslations('AdminPage.events.modules');
    const locale = useLocale();
    const included = row.source !== 'NONE';
    const canGrant = editable && !included && !row.grant;
    const canRevoke = editable && Boolean(row.grant);
    const grant = useCallback(() => onGrantAction(row.moduleKey), [onGrantAction, row.moduleKey]);
    const revoke = useCallback(() => onRevokeAction(row.moduleKey), [onRevokeAction, row.moduleKey]);

    return (
        <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            {/* Icon */}
            <span
                aria-hidden
                className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    included ? 'bg-surface-muted text-ink' : 'border border-dashed border-border text-ink-faint',
                )}
            >
                <Icon className="h-4 w-4" />
            </span>

            {/* Name and grant */}
            <div className="min-w-0 flex-1 pt-1">
                <p className={cn('text-sm font-semibold', included ? 'text-ink' : 'text-ink-muted')}>{name}</p>
                {row.grant && (
                    <p className="mt-0.5 text-xs text-ink-muted">
                        {t('grantedOn', { date: formatAdminDate(locale, row.grant.grantedAt) })}
                        <span className="text-ink"> · {row.grant.reason}</span>
                    </p>
                )}
            </div>

            {/* Source and action */}
            <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {included ? (
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', SOURCE_STYLES[row.source])}>{t(`source.${row.source}`)}</span>
                ) : (
                    <span className="text-xs text-ink-faint">{t('source.NONE')}</span>
                )}
                {canGrant && (
                    <button
                        type="button"
                        onClick={grant}
                        className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-xs font-semibold text-ink transition hover:bg-canvas"
                    >
                        {t('grant')}
                    </button>
                )}
                {canRevoke && (
                    <button
                        type="button"
                        onClick={revoke}
                        className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                    >
                        {t('revoke')}
                    </button>
                )}
            </div>
        </li>
    );
}
