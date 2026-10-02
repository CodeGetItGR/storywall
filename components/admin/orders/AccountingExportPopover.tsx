'use client';

import { Popover } from '@base-ui/react/popover';
import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { useAccountingExport } from '@/hooks/useAccountingExport';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';

const LABEL = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function AccountingExportPopover() {
    const t = useTranslations('AdminPage.orders.export');
    const exporter = useAccountingExport();
    const toErrorMessage = useApiErrorMessage();

    function handleFromChange(event: ChangeEvent<HTMLInputElement>) {
        exporter.setFrom(event.currentTarget.value);
    }

    function handleToChange(event: ChangeEvent<HTMLInputElement>) {
        exporter.setTo(event.currentTarget.value);
    }

    function handleDownload() {
        void exporter.download();
    }

    return (
        <Popover.Root>
            {/* Trigger */}
            <Popover.Trigger className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-primary/30">
                <Download className="h-4 w-4" />
                {t('action')}
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-40">
                    <Popover.Popup className="w-[min(340px,calc(100vw-32px))] rounded-xl border border-border bg-card p-4 text-ink shadow-[0_20px_50px_-20px_rgba(18,20,28,0.4)] outline-none">
                        {/* Title */}
                        <Popover.Title className="text-sm font-bold text-ink">{t('title')}</Popover.Title>

                        {/* Range */}
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-0.5">
                                <span className={LABEL}>{t('from')}</span>
                                <input type="date" value={exporter.range.from} onChange={handleFromChange} className={adminInputClass()} />
                            </label>
                            <label className="flex flex-col gap-0.5">
                                <span className={LABEL}>{t('to')}</span>
                                <input
                                    type="date"
                                    value={exporter.range.to}
                                    min={exporter.range.from || undefined}
                                    onChange={handleToChange}
                                    className={adminInputClass()}
                                />
                            </label>
                        </div>
                        {exporter.rangeError && <p className="mt-2 text-xs text-status-warn">{t(exporter.rangeError)}</p>}
                        {Boolean(exporter.error) && <p className="mt-2 text-xs text-status-danger">{toErrorMessage(exporter.error)}</p>}

                        {/* Footer */}
                        <div className="mt-4 flex justify-end border-t border-border pt-3">
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={Boolean(exporter.rangeError) || exporter.downloading}
                                className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {exporter.downloading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('download')}
                            </button>
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
