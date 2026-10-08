'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { adminInputClass } from '@/components/admin/AdminField';
import { useCommissionTiersEditor } from '@/hooks/useCommissionTiersEditor';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CommissionTiersDrawer({
    open,
    collaborator,
    onCloseAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations.tiers');
    const tAdmin = useTranslations('AdminPage');
    const editor = useCommissionTiersEditor(collaborator, onCloseAction);

    return (
        <AdminDrawer
            open={open}
            onClose={editor.handleClose}
            closeDisabled={editor.isSaving}
            closeLabel={tAdmin('cancel')}
            title={t('drawerTitle', { name: collaborator.name })}
            footer={
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={editor.handleClose}
                        className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                    >
                        {tAdmin('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="commission-tiers-form"
                        disabled={editor.isSaving}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {editor.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {tAdmin('save')}
                    </button>
                </div>
            }
        >
            <form id="commission-tiers-form" onSubmit={editor.handleSubmit} noValidate className="space-y-4">
                {/* Rules */}
                <p className="text-sm text-ink-muted">{t('hint')}</p>

                {/* Tiers */}
                {editor.drafts.length === 0 ? (
                    <p className="rounded-lg bg-canvas px-3 py-3 text-sm text-ink-muted">{t('emptyEditor')}</p>
                ) : (
                    <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                            <span>{t('columns.from')}</span>
                            <span>{t('columns.percent')}</span>
                        </div>
                        {editor.drafts.map((draft, index) => (
                            <div key={draft.key} className="grid grid-cols-[1fr_1fr_2.5rem] items-center gap-2">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    step={1}
                                    value={draft.minActivations}
                                    data-tier-key={draft.key}
                                    data-field="minActivations"
                                    onChange={editor.handleChange}
                                    aria-label={t('fromLabel', { number: index + 1 })}
                                    className={adminInputClass('font-mono')}
                                />
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={draft.commissionPercent}
                                    data-tier-key={draft.key}
                                    data-field="commissionPercent"
                                    onChange={editor.handleChange}
                                    aria-label={t('percentLabel', { number: index + 1 })}
                                    className={adminInputClass('font-mono')}
                                />
                                <button
                                    type="button"
                                    data-tier-key={draft.key}
                                    onClick={editor.handleRemove}
                                    aria-label={t('remove', { number: index + 1 })}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-status-danger transition-colors hover:bg-rose-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add */}
                <button
                    type="button"
                    onClick={editor.handleAdd}
                    disabled={!editor.canAdd}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" />
                    {t('add')}
                </button>

                {/* Errors */}
                {editor.ruleError && <p className="text-sm text-status-danger">{t(`errors.${editor.ruleError}`)}</p>}
                {Boolean(editor.saveError) && (
                    <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(editor.saveError)}`)}</p>
                )}
            </form>
        </AdminDrawer>
    );
}
