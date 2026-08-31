'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useSaveCollaborationCode } from '@/hooks/useAdmin';
import { collaborationCodeCreateFromFormData, collaborationCodePatchFromFormData, instantToLocalInput } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaborationCodeResponseDto, CollaboratorResponseDto } from '@/lib/api/types';

export function CollaborationCodeDrawer({
    open,
    collaborator,
    code,
    onCloseAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto | null;
    code: CollaborationCodeResponseDto | null;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const saveCode = useSaveCollaborationCode(collaborator?.id ?? null);

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!collaborator) return;
        const formData = new FormData(event.currentTarget);
        const input = code ? collaborationCodePatchFromFormData(formData, code) : collaborationCodeCreateFromFormData(formData);
        await saveCode.mutateAsync({ id: code?.id, input });
        onCloseAction();
    }

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={tAdmin('cancel')}
            title={code ? t('codes.editTitle', { code: code.code }) : t('codes.createTitle')}
            subtitle={collaborator?.name}
            footer={
                <div className="ml-auto flex items-center gap-2">
                    <button type="button" onClick={onCloseAction} className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted">
                        {tAdmin('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="collaboration-code-form"
                        disabled={saveCode.isPending || !collaborator}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saveCode.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {tAdmin('save')}
                    </button>
                </div>
            }
        >
            <form id="collaboration-code-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Code identity */}
                <AdminField label={t('codes.fields.code')} required>
                    <input
                        name="code"
                        required
                        pattern="[A-Za-z0-9-]+"
                        maxLength={40}
                        defaultValue={code?.code}
                        disabled={Boolean(code)}
                        className={adminInputClass('font-mono uppercase disabled:bg-surface-muted disabled:text-ink-faint')}
                    />
                </AdminField>
                <AdminField label={t('codes.fields.label')} required>
                    <input name="label" required maxLength={140} defaultValue={code?.label} className={adminInputClass()} />
                </AdminField>

                {/* Rates */}
                <div className="grid grid-cols-2 gap-3">
                    <AdminField label={t('codes.fields.discountPercent')} required>
                        <input
                            name="discountPercent"
                            type="number"
                            min={0}
                            max={99}
                            required
                            defaultValue={code?.discountPercent ?? 0}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('codes.fields.commissionPercent')} required>
                        <input
                            name="commissionPercent"
                            type="number"
                            min={0}
                            max={100}
                            required
                            defaultValue={code?.commissionPercent ?? 0}
                            className={adminInputClass()}
                        />
                    </AdminField>
                </div>

                {/* Availability */}
                <div className="grid grid-cols-2 gap-3">
                    <AdminField label={t('codes.fields.startsAt')} optional>
                        <input name="startsAt" type="datetime-local" defaultValue={instantToLocalInput(code?.startsAt ?? null)} className={adminInputClass()} />
                    </AdminField>
                    <AdminField label={t('codes.fields.endsAt')} optional>
                        <input name="endsAt" type="datetime-local" defaultValue={instantToLocalInput(code?.endsAt ?? null)} className={adminInputClass()} />
                    </AdminField>
                </div>
                <AdminField label={t('codes.fields.maxRedemptions')} optional>
                    <input name="maxRedemptions" type="number" min={1} defaultValue={code?.maxRedemptions ?? ''} className={adminInputClass()} />
                </AdminField>
                {code && (
                    <AdminField label={t('fields.status')} required>
                        <select name="status" defaultValue={code.status} className={adminInputClass()}>
                            <option value="ACTIVE">{t('codes.status.ACTIVE')}</option>
                            <option value="DISABLED">{t('codes.status.DISABLED')}</option>
                        </select>
                    </AdminField>
                )}
                {saveCode.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(saveCode.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
