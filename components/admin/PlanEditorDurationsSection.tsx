'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlanDurationEditor } from '@/components/admin/PlanDurationEditor';
import { PlanDurationRow } from '@/components/admin/PlanDurationRow';
import type { PlanDurationsEditor } from '@/hooks/usePlanDurationsEditor';
import { adminErrorMessageKey } from '@/lib/adminUtils';

export function PlanEditorDurationsSection({ id, editor }: { id: string; editor: PlanDurationsEditor }) {
    const t = useTranslations('AdminPage');
    const { draft } = editor;

    const editorProps = {
        currency: editor.currency,
        canSave: editor.canSave,
        isSaving: editor.isSaving,
        onChangeAction: editor.updateDraft,
        onKeyDownAction: editor.handleEditorKeyDown,
        onSaveAction: editor.save,
        onCancelAction: editor.close,
        onToggleActiveAction: editor.toggleActive,
    };

    return (
        <section id={id} className="scroll-mt-14 pt-6">
            {/* Durations */}
            <h4 className="mb-1 text-sm font-bold text-ink">{t('plans.sections.durations')}</h4>
            <p className="mb-3 max-w-2xl text-sm leading-6 text-ink-muted">{t('plans.durations.hint')}</p>

            {/* Empty */}
            {editor.options.length === 0 && !draft && <p className="mb-3 text-sm font-semibold text-status-warn">{t('plans.durations.empty')}</p>}

            {/* Duration rows */}
            {editor.options.length > 0 && (
                <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border">
                    {editor.options.map((option) =>
                        draft?.optionId === option.id ? (
                            <PlanDurationEditor key={option.id} draft={draft} option={option} inset {...editorProps} />
                        ) : (
                            <PlanDurationRow key={option.id} option={option} currency={editor.currency} onEditAction={editor.openEdit} />
                        ),
                    )}
                </div>
            )}

            {/* New duration */}
            {draft && draft.optionId === null && (
                <div className="mt-3">
                    <PlanDurationEditor draft={draft} option={null} {...editorProps} />
                </div>
            )}
            {!draft && (
                <button
                    type="button"
                    onClick={editor.openNew}
                    className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-bold text-ink-muted transition hover:bg-surface-muted"
                >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('plans.durations.add')}
                </button>
            )}

            {/* Error */}
            {editor.error && <p className="mt-2 text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(editor.error)}`)}</p>}
        </section>
    );
}
