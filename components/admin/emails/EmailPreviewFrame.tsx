'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { type EmailPreviewWidth, useEmailPreviewWidth } from '@/hooks/useEmailPreviewWidth';
import type { AdminEmailPreviewDto } from '@/lib/api/types';

export function EmailPreviewFrame({
    preview,
    isLoading,
    error,
    note,
}: {
    preview: AdminEmailPreviewDto | null;
    isLoading: boolean;
    error: string | null;
    note?: string | null;
}) {
    const t = useTranslations('AdminPage.accounts.emails');
    const { width, setWidth, widthPx } = useEmailPreviewWidth();
    const widthOptions = [
        { value: 'desktop' as EmailPreviewWidth, label: t('previewDesktop') },
        { value: 'phone' as EmailPreviewWidth, label: t('previewPhone') },
    ];

    return (
        <section aria-labelledby="email-preview-heading" className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 id="email-preview-heading" className="flex items-center gap-2 text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('preview')}
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label={t('previewLoading')} /> : null}
                </h3>
                <FunnelSegmented label={t('preview')} options={widthOptions} value={width} onChangeAction={setWidth} />
            </div>

            {error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {error}
                </p>
            ) : null}
            {!preview && !error ? <p className="text-sm text-ink-muted">{isLoading ? t('previewLoading') : t('previewEmpty')}</p> : null}

            {preview ? (
                <div className="overflow-hidden rounded-lg border border-border">
                    {/* Inbox header */}
                    <dl className="space-y-1 border-b border-border bg-canvas px-4 py-3 text-sm">
                        <div className="flex gap-2">
                            <dt className="w-16 shrink-0 text-ink-faint">{t('previewTo')}</dt>
                            <dd className="min-w-0 truncate font-mono text-xs leading-5 text-ink">{preview.to}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="w-16 shrink-0 text-ink-faint">{t('previewSubject')}</dt>
                            <dd className="min-w-0 font-semibold text-ink">{preview.subject}</dd>
                        </div>
                    </dl>
                    {/* Email */}
                    <div className="overflow-x-auto bg-[#FFFAF3]">
                        <iframe
                            title={t('previewFrame')}
                            sandbox=""
                            srcDoc={preview.html}
                            style={{ width: widthPx }}
                            className="mx-auto block h-[600px] max-w-none border-0"
                        />
                    </div>
                </div>
            ) : null}

            {preview && note ? <p className="text-xs text-ink-faint">{note}</p> : null}
        </section>
    );
}
