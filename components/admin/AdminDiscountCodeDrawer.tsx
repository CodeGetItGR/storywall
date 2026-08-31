'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useSaveDiscountCode } from '@/hooks/useAdmin';
import { discountCodeCreateFromFormData, discountCodePatchFromFormData, instantToLocalInput } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { DiscountCodeResponseDto } from '@/lib/api/types';

export function AdminDiscountCodeDrawer({
    open,
    code,
    onCloseAction,
}: {
    open: boolean;
    code: DiscountCodeResponseDto | null;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.discountCodes');
    const tCollaborations = useTranslations('AdminPage.collaborations');
    const tCodes = useTranslations('AdminPage.collaborations.codes');
    const tAdmin = useTranslations('AdminPage');
    const saveCode = useSaveDiscountCode();

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const input = code ? discountCodePatchFromFormData(formData, code) : discountCodeCreateFromFormData(formData);
        await saveCode.mutateAsync({ id: code?.id, input });
        onCloseAction();
    }

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={tAdmin('cancel')}
            title={code ? t('editTitle', { code: code.code }) : t('createTitle')}
            subtitle={t('subtitle')}
            footer={
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCloseAction}
                        className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted"
                    >
                        {tAdmin('cancel')}
                    </button>
                    <button
                        type="submit"
                        form="discount-code-form"
                        disabled={saveCode.isPending}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saveCode.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {tAdmin('save')}
                    </button>
                </div>
            }
        >
            <form id="discount-code-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Code identity */}
                <AdminField label={tCodes('fields.code')} required>
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
                <AdminField label={tCodes('fields.label')} required>
                    <input name="label" required maxLength={140} defaultValue={code?.label} className={adminInputClass()} />
                </AdminField>

                {/* Discount */}
                <AdminField label={tCodes('fields.discountPercent')} required>
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

                {/* Availability */}
                <div className="grid grid-cols-2 gap-3">
                    <AdminField label={tCodes('fields.startsAt')} optional>
                        <input
                            name="startsAt"
                            type="datetime-local"
                            defaultValue={instantToLocalInput(code?.startsAt ?? null)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={tCodes('fields.endsAt')} optional>
                        <input
                            name="endsAt"
                            type="datetime-local"
                            defaultValue={instantToLocalInput(code?.endsAt ?? null)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                </div>
                <AdminField label={tCodes('fields.maxRedemptions')} optional>
                    <input name="maxRedemptions" type="number" min={1} defaultValue={code?.maxRedemptions ?? ''} className={adminInputClass()} />
                </AdminField>
                {code && (
                    <AdminField label={tCollaborations('fields.status')} required>
                        <select name="status" defaultValue={code.status} className={adminInputClass()}>
                            <option value="ACTIVE">{tCodes('status.ACTIVE')}</option>
                            <option value="DISABLED">{tCodes('status.DISABLED')}</option>
                        </select>
                    </AdminField>
                )}
                {saveCode.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(saveCode.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
