'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminDiscountCodes, useLinkDiscountCodeToCollaborator } from '@/hooks/useAdmin';
import { linkDiscountCodeFromFormData } from '@/lib/adminCollaborations';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function LinkPartnerDiscountCodeDrawer({
    open,
    collaborator,
    onCloseAction,
}: {
    open: boolean;
    collaborator: CollaboratorResponseDto | null;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations.linkCode');
    const tCodes = useTranslations('AdminPage.collaborations.codes');
    const tAdmin = useTranslations('AdminPage');
    const codesQuery = useAdminDiscountCodes();
    const linkCode = useLinkDiscountCodeToCollaborator(collaborator?.id ?? null);
    const codes = codesQuery.data ?? [];

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!collaborator) return;
        const input = linkDiscountCodeFromFormData(new FormData(event.currentTarget));
        await linkCode.mutateAsync(input);
        onCloseAction();
    }

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={tAdmin('cancel')}
            title={t('title')}
            subtitle={collaborator?.name}
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
                        form="link-discount-code-form"
                        disabled={linkCode.isPending || !collaborator || codes.length === 0}
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {linkCode.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t('action')}
                    </button>
                </div>
            }
        >
            {codesQuery.isLoading ? (
                <LoadingState label={t('loading')} className="justify-start py-3" />
            ) : (
                <form id="link-discount-code-form" onSubmit={handleSubmit} className="space-y-5">
                    {/* Code picker */}
                    <AdminField label={t('code')} required hint={codes.length === 0 ? t('empty') : undefined}>
                        <select name="discountCodeId" required disabled={codes.length === 0} className={adminInputClass()}>
                            <option value="">{t('choose')}</option>
                            {codes.map((code) => (
                                <option key={code.id} value={code.id}>
                                    {code.code} · {code.label} · {code.discountPercent}%
                                </option>
                            ))}
                        </select>
                    </AdminField>

                    {/* Commission */}
                    <AdminField label={tCodes('fields.commissionPercent')} required>
                        <input name="commissionPercent" type="number" min={0} max={100} required defaultValue={0} className={adminInputClass()} />
                    </AdminField>
                    {codesQuery.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(codesQuery.error)}`)}</p>}
                    {linkCode.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(linkCode.error)}`)}</p>}
                </form>
            )}
        </AdminDrawer>
    );
}
