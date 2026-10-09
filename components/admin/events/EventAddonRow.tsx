'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { formatAdminDate } from '@/lib/adminOrders';
import type { AdminEventDetailDto } from '@/lib/api/types';

// One bought add-on: its name, code and start, with a Remove action while the event is open.
export function EventAddonRow({
    addon,
    editable,
    onRemoveAction,
}: {
    addon: AdminEventDetailDto['addons'][number];
    editable: boolean;
    onRemoveAction: (code: string, name: string) => void;
}) {
    const t = useTranslations('AdminPage.events.addons');
    const locale = useLocale();
    const remove = useCallback(() => onRemoveAction(addon.code, addon.name), [addon.code, addon.name, onRemoveAction]);

    return (
        <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            {/* Name and code */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{addon.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                    <span className="font-mono">{addon.code}</span>
                    {addon.activatedAt && ` · ${t('activated', { date: formatAdminDate(locale, addon.activatedAt) })}`}
                </p>
            </div>

            {/* Remove */}
            {editable && (
                <button
                    type="button"
                    onClick={remove}
                    className="inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-semibold text-ink-muted transition hover:bg-status-danger-wash hover:text-status-danger"
                >
                    {t('remove')}
                </button>
            )}
        </li>
    );
}
