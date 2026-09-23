'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlanEditorDangerRow } from '@/components/admin/PlanEditorDangerRow';

export function PlanEditorDangerSection({ id, isDeleting, onDeleteOpenAction }: { id: string; isDeleting: boolean; onDeleteOpenAction: () => void }) {
    const t = useTranslations('AdminPage');

    return (
        <section id={id} className="scroll-mt-14 pt-6 pb-2">
            {/* Danger */}
            <h4 className="mb-1 text-sm font-bold text-ink">{t('plans.sections.danger')}</h4>
            <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.archiveInsteadHint')}</p>
            <div className="rounded-lg border border-status-danger-wash bg-status-danger-wash/40 px-4 py-1">
                <PlanEditorDangerRow title={t('plans.delete')} body={t('plans.deleteConfirmBody')}>
                    <button
                        type="button"
                        onClick={onDeleteOpenAction}
                        disabled={isDeleting}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-status-danger px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('plans.delete')}
                    </button>
                </PlanEditorDangerRow>
            </div>
        </section>
    );
}
