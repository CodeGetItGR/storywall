'use client';

import { Loader2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QrCardLayoutSegmented } from '@/components/admin/qrCards/layoutEditor/QrCardLayoutSegmented';
import type { QrCardLayoutEditorState, QrCardLayoutSample } from '@/hooks/useQrCardLayoutEditor';

const SAMPLES: QrCardLayoutSample[] = ['short', 'gift'];

// The editor's footer: sample card, reset, any save error, cancel and save.
export function QrCardLayoutToolbar({ editor }: { editor: QrCardLayoutEditorState }) {
    const t = useTranslations('AdminPage.qrCards.layout');

    return (
        <div className="flex w-full flex-wrap items-end justify-between gap-3">
            {/* Sample */}
            <div className="flex items-end gap-3">
                <QrCardLayoutSegmented
                    name="layout-sample"
                    legend={t('sample.label')}
                    value={editor.sample}
                    options={SAMPLES.map((value) => ({ value, label: t(`sample.${value}`) }))}
                    onChangeAction={editor.handleSampleChange}
                />
                {/* Reset */}
                <button
                    type="button"
                    onClick={editor.reset}
                    disabled={editor.isSaving}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('reset')}
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {editor.saveError && (
                    <p role="alert" className="max-w-xs text-xs text-status-danger">
                        {editor.saveError}
                    </p>
                )}
                <button
                    type="button"
                    onClick={editor.requestClose}
                    disabled={editor.isSaving}
                    className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
                >
                    {t('cancel')}
                </button>
                <button
                    type="button"
                    onClick={editor.save}
                    disabled={editor.isSaving || !editor.dirty}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                    {editor.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t('save')}
                </button>
            </div>
        </div>
    );
}
