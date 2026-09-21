'use client';

import { Popover } from '@base-ui/react/popover';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { PlanModuleChangeList } from '@/components/admin/plans/PlanModuleChangeList';
import { PlanModuleConfigFields } from '@/components/admin/plans/PlanModuleConfigFields';
import { PlanModuleConfigJsonField } from '@/components/admin/plans/PlanModuleConfigJsonField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type EditableCell, usePlanModuleCellDraft } from '@/hooks/usePlanModuleCellDraft';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanModuleConfigPopover({
    cell,
    plan,
    moduleName,
    anchor,
    onCloseAction,
}: {
    cell: EditableCell;
    plan: PlanTierResponseDto;
    moduleName: string;
    anchor: HTMLElement;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const draft = usePlanModuleCellDraft({ cell, plan, onSavedAction: onCloseAction });

    function handleOpenChange(open: boolean) {
        if (!open && !draft.pending) onCloseAction();
    }

    return (
        <>
            <Popover.Root open onOpenChange={handleOpenChange}>
                <Popover.Portal>
                    <Popover.Positioner anchor={anchor} side="bottom" align="start" sideOffset={6} className="z-40">
                        <Popover.Popup className="w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-card p-4 text-ink shadow-[0_20px_50px_-20px_rgba(18,20,28,0.4)] outline-none">
                            {/* Title */}
                            <Popover.Title className="text-sm font-bold text-ink">{t('plans.grid.cell.title', { module: moduleName, plan: plan.name })}</Popover.Title>

                            {/* Included */}
                            <div className="mt-3 rounded-lg border border-border">
                                <AdminSwitch label={t('plans.grid.cell.includedSwitch')} checked={draft.included} onCheckedChangeAction={draft.handleIncludedChange} />
                            </div>

                            {/* Config */}
                            <div className="mt-4 space-y-3">
                                <PlanModuleConfigFields fields={draft.fields} draft={draft.knownDraft} errors={draft.fieldErrors} onChangeAction={draft.handleKnownChange} />
                                <PlanModuleConfigJsonField value={draft.jsonText} error={draft.jsonError} onChangeAction={draft.handleJsonChange} />
                                <button type="button" onClick={draft.resetToSeed} className="text-xs font-semibold text-ink-muted underline-offset-2 hover:underline">
                                    {t('plans.grid.cell.resetToDefault')}
                                </button>
                            </div>

                            {/* Error */}
                            {draft.error && <p className="mt-3 text-xs text-status-danger">{t(`errors.${adminErrorMessageKey(draft.error)}`)}</p>}

                            {/* Footer */}
                            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                                <button type="button" onClick={onCloseAction} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink">
                                    {t('cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={draft.requestSave}
                                    disabled={!draft.canSave || draft.isSaving}
                                    className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {draft.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t('save')}
                                </button>
                            </div>
                        </Popover.Popup>
                    </Popover.Positioner>
                </Popover.Portal>
            </Popover.Root>

            <ConfirmActionModal
                open={Boolean(draft.pending)}
                onCloseAction={draft.cancelSave}
                title={t('plans.grid.cell.confirmTitle', { module: moduleName, plan: plan.name })}
                body={<PlanModuleChangeList pending={draft.pending} />}
                cancelLabel={t('cancel')}
                confirmLabel={t('save')}
                isConfirming={draft.isSaving}
                onConfirmAction={draft.confirmSave}
                tone="default"
                size="md"
            />
        </>
    );
}
