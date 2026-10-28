'use client';

import { Download, Loader2, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { QrCardExportFormat, QrCardExportState } from '@/hooks/useQrCardExport';

const FILE_BUTTON_CLASS =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70 disabled:opacity-60';

function FileButton({ format, exporter, label }: { format: QrCardExportFormat; exporter: QrCardExportState; label: string }) {
    const Icon = exporter.busy === format ? Loader2 : Download;
    return (
        <button
            type="button"
            onClick={format === 'png' ? exporter.savePng : exporter.savePdf}
            disabled={exporter.busy !== null}
            className={FILE_BUTTON_CLASS}
        >
            <Icon className={exporter.busy === format ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
            {label}
        </button>
    );
}

export function QrCardActions({ exporter }: { exporter: QrCardExportState }) {
    const t = useTranslations('QrCardPage.actions');

    return (
        <div className="flex flex-col gap-2">
            {/* Print */}
            <button
                type="button"
                onClick={exporter.print}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
            >
                <Printer className="h-4 w-4" aria-hidden="true" />
                {t('print')}
            </button>
            {/* Files */}
            <div className="grid grid-cols-2 gap-2">
                <FileButton format="png" exporter={exporter} label={t('png')} />
                <FileButton format="pdf" exporter={exporter} label={t('pdf')} />
            </div>
            {exporter.failed && (
                <p role="alert" className="text-sm text-status-danger">
                    {t('failed')}
                </p>
            )}
        </div>
    );
}
