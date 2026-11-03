'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { InviartCollectionDrawer } from '@/components/admin/inviart/InviartCollectionDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminEventTypeLabel } from '@/hooks/useAdminEventTypeLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useInviartCollectionsPanel } from '@/hooks/useInviartCollectionsPanel';

// Which INVIART collection each occasion shows, on its page and in its events' Overview.
export function InviartCollectionsPanel() {
    const t = useTranslations('AdminPage.inviart');
    const toErrorMessage = useApiErrorMessage();
    const eventTypeLabel = useAdminEventTypeLabel();
    const panel = useInviartCollectionsPanel();

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const row = panel.rows.find((item) => item.eventType === event.currentTarget.dataset.eventType);
        if (row) panel.openRow(row);
    }

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="border-b border-border pb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
            </header>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {panel.isLoading && <LoadingState className="justify-start px-5 py-6" />}
                {panel.error ? <p className="px-5 py-6 text-sm text-status-danger">{toErrorMessage(panel.error)}</p> : null}
                {panel.rows.length > 0 && (
                    <table className="w-full border-collapse text-sm">
                        {/* Columns */}
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="px-5 py-3 font-bold">{t('occasion')}</th>
                                <th className="px-5 py-3 font-bold">{t('collection')}</th>
                            </tr>
                        </thead>

                        {/* Rows */}
                        <tbody>
                            {panel.rows.map((row) => (
                                <tr key={row.eventType} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                    <td className="px-5 py-3.5">
                                        <button
                                            type="button"
                                            data-event-type={row.eventType}
                                            onClick={handleOpen}
                                            className="text-left font-semibold text-ink hover:underline"
                                        >
                                            {eventTypeLabel(row.eventType)}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {row.collectionHandle ? (
                                            <span className="font-mono text-xs text-ink">{row.collectionHandle}</span>
                                        ) : (
                                            <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-1 text-[11px] font-bold text-status-neutral">
                                                {t('notSet')}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Drawer */}
            {panel.open && (
                <InviartCollectionDrawer
                    key={panel.open.eventType}
                    row={panel.open}
                    title={eventTypeLabel(panel.open.eventType)}
                    onCloseAction={panel.close}
                />
            )}
        </section>
    );
}
