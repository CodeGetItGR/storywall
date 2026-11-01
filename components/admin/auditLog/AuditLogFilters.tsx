'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import type { AuditLogPanelState } from '@/hooks/useAdminAuditLog';
import { AUDIT_ACTIONS } from '@/lib/adminAuditLog';

// Action and event filters, and the admin picked from a row as a removable chip.
export function AuditLogFilters({ panel }: { panel: AuditLogPanelState }) {
    const t = useTranslations('AdminPage.auditLog');

    return (
        <div className="flex flex-wrap items-start gap-3 border-b border-border p-4">
            {/* Action */}
            <label className="w-full sm:w-64">
                <span className="sr-only">{t('filters.action')}</span>
                <select value={panel.action ?? ''} onChange={panel.handleActionChange} className={adminInputClass()}>
                    <option value="">{t('filters.allActions')}</option>
                    {AUDIT_ACTIONS.map((action) => (
                        <option key={action} value={action}>
                            {t(`actions.${action}`)}
                        </option>
                    ))}
                </select>
            </label>

            {/* Event */}
            <div className="w-full sm:w-80">
                <label className="relative block">
                    <span className="sr-only">{t('filters.event')}</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
                    <input
                        type="search"
                        value={panel.eventInput}
                        onChange={panel.handleEventChange}
                        placeholder={t('filters.eventPlaceholder')}
                        aria-invalid={panel.eventInvalid}
                        spellCheck={false}
                        className={adminInputClass('pr-9 pl-9 font-mono')}
                    />
                    {panel.eventInput ? (
                        <button
                            type="button"
                            onClick={panel.clearEvent}
                            aria-label={t('filters.clearEvent')}
                            className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:text-ink"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : null}
                </label>
                {panel.eventInvalid ? <p className="mt-1.5 text-xs text-status-warn">{t('filters.eventInvalid')}</p> : null}
            </div>

            {/* Admin */}
            {panel.admin ? (
                <span className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-canvas pr-1.5 pl-3 text-sm font-semibold text-ink">
                    {t('filters.admin', { name: panel.admin.label })}
                    <button
                        type="button"
                        onClick={panel.clearAdmin}
                        aria-label={t('filters.clearAdmin')}
                        className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:text-ink"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </span>
            ) : null}
        </div>
    );
}
