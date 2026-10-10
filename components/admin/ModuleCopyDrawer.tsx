'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { ModuleCopyFieldGroup } from '@/components/admin/ModuleCopyFieldGroup';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { useModuleCopyEditor } from '@/hooks/useModuleCopyEditor';

// Edits one module's name, description and plan card line for one event type.
export function ModuleCopyDrawer({ editor, eventTypeName }: { editor: ReturnType<typeof useModuleCopyEditor>; eventTypeName: string }) {
    const t = useTranslations('AdminPage');
    const tCopy = useTranslations('AdminPage.eventTypes.moduleCopy');
    const { openRow, draft } = editor;

    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        editor.save();
    }

    return (
        <>
            <AdminDrawer
                open={Boolean(openRow)}
                onClose={editor.close}
                closeLabel={t('cancel')}
                closeDisabled={editor.isSaving}
                title={openRow?.defaultName ?? ''}
                subtitle={eventTypeName}
                footer={
                    <>
                        {/* Reset */}
                        <div>
                            {openRow?.isCustom && (
                                <button
                                    type="button"
                                    onClick={editor.requestReset}
                                    disabled={editor.isSaving}
                                    className="min-h-9 rounded-md px-2 text-sm font-semibold text-status-danger disabled:opacity-50"
                                >
                                    {tCopy('reset')}
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={editor.close}
                                disabled={editor.isSaving}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form="module-copy-form"
                                disabled={editor.isSaving}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {editor.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('save')}
                            </button>
                        </div>
                    </>
                }
            >
                {openRow && draft && (
                    <form key={openRow.moduleKey} id="module-copy-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <ModuleCopyFieldGroup field="name" values={draft.name} errorFor={editor.fieldError} onChangeAction={editor.setValue} />

                        {/* Description */}
                        <ModuleCopyFieldGroup
                            field="description"
                            values={draft.description}
                            errorFor={editor.fieldError}
                            onChangeAction={editor.setValue}
                        />

                        {/* Plan card line */}
                        <ModuleCopyFieldGroup
                            field="cardLabel"
                            values={draft.cardLabel}
                            placeholders={{ en: draft.name.en.trim() || undefined, el: draft.name.el.trim() || undefined }}
                            hint={tCopy('cardLabelHint')}
                            errorFor={editor.fieldError}
                            onChangeAction={editor.setValue}
                        />

                        {editor.formError && <p className="text-sm text-status-danger">{t(`errors.${editor.formError}`)}</p>}
                    </form>
                )}
            </AdminDrawer>

            {/* Reset confirmation */}
            <ConfirmActionModal
                open={editor.isResetConfirmOpen}
                onCloseAction={editor.cancelReset}
                title={tCopy('resetTitle', { module: openRow?.defaultName ?? '' })}
                body={tCopy('resetBody')}
                cancelLabel={t('cancel')}
                confirmLabel={tCopy('reset')}
                isConfirming={editor.isSaving}
                onConfirmAction={editor.reset}
                icon={editor.isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
