'use client';

import { Download, FileJson, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useDataExport } from '@/hooks/useDataExport';

// "Download my data" — GET /api/me/data-export (GDPR art. 15/20).
export function ProfileDataSection() {
    const t = useTranslations('ProfilePage.dataExport');
    const dataExport = useDataExport(t('failed'));

    return (
        <section className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
            {/* Data export header */}
            <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-base font-semibold text-ink">{t('title')}</h2>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-muted">{t('body')}</p>
                <Button
                    type="button"
                    variant="outline"
                    disabled={dataExport.isDownloading}
                    onClick={dataExport.download}
                    className="shrink-0 gap-2 self-start rounded-full px-4 sm:self-auto"
                >
                    {dataExport.isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                    )}
                    {dataExport.isDownloading ? t('downloading') : t('download')}
                </Button>
            </div>

            {dataExport.error && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                    {dataExport.error}
                </p>
            )}
        </section>
    );
}
