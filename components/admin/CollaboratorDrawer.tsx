'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useSaveCollaborator } from '@/hooks/useAdmin';
import { collaboratorRequestFromFormData } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorDrawer({
    open,
    collaborator,
    onCloseAction,
    onSavedAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto | null;
    onCloseAction: () => void;
    onSavedAction?: (collaborator: CollaboratorResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const saveCollaborator = useSaveCollaborator();

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const input = collaboratorRequestFromFormData(new FormData(event.currentTarget));
        try {
            const saved = await saveCollaborator.mutateAsync({ id: collaborator?.id, input });
            onSavedAction?.(saved);
            onCloseAction();
        } catch {
            // Shown in the form through saveCollaborator.error.
        }
    }

    // Clears a failed save so it doesn't reappear the next time the drawer opens.
    function handleClose() {
        saveCollaborator.reset();
        onCloseAction();
    }

    return (
        <AdminDrawer
            open={open}
            onClose={handleClose}
            closeLabel={tAdmin('cancel')}
            title={collaborator ? t('drawer.editTitle', { name: collaborator.name }) : t('drawer.createTitle')}
            footer={
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                    >
                        {tAdmin('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="collaborator-form"
                        disabled={saveCollaborator.isPending}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saveCollaborator.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {tAdmin('save')}
                    </button>
                </div>
            }
        >
            <form id="collaborator-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Identity */}
                <AdminField label={t('fields.name')} required>
                    <input name="name" required maxLength={200} defaultValue={collaborator?.name} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.contactEmail')} required>
                    <input
                        name="contactEmail"
                        required
                        type="email"
                        maxLength={320}
                        defaultValue={collaborator?.contactEmail}
                        className={adminInputClass()}
                    />
                </AdminField>

                {/* Notes */}
                <AdminField label={t('fields.notes')} optional>
                    <textarea
                        name="notes"
                        maxLength={2000}
                        defaultValue={collaborator?.notes ?? ''}
                        className={adminInputClass('min-h-28 resize-y')}
                    />
                </AdminField>
                {saveCollaborator.error && (
                    <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(saveCollaborator.error)}`)}</p>
                )}
            </form>
        </AdminDrawer>
    );
}
