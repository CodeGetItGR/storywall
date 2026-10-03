'use client';

import { useTranslations } from 'next-intl';

import { RoleFormBody } from '@/components/memberRoles/RoleFormBody';
import { RoleSheet } from '@/components/memberRoles/RoleSheet';
import { RoleSheetFooter } from '@/components/memberRoles/RoleSheetFooter';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useMemberRoleUnlock } from '@/hooks/useMemberRoleUnlock';
import { useRoleForm } from '@/hooks/useRoleForm';
import type { EventMemberResponseDto } from '@/lib/api/types';

const FORM_ID = 'member-role-form';

export function MemberRoleSheet({ eventId, member, onCloseAction }: { eventId: string; member: EventMemberResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('MemberRoles');
    const form = useRoleForm({ eventId, member, mode: 'host', onDoneAction: onCloseAction });
    const unlock = useMemberRoleUnlock(member.id);

    return (
        <>
            <RoleSheet title={member.displayName} closeLabel={t('close')} onCloseAction={onCloseAction} footer={<RoleSheetFooter formId={FORM_ID} form={form} />}>
                <RoleFormBody formId={FORM_ID} form={form} />

                {/* Unlock */}
                {form.allowCustom && (
                    <div className="pt-4">
                        {unlock.done ? (
                            <p className="text-sm text-ink-muted">{t('host.unlocked')}</p>
                        ) : (
                            <button
                                type="button"
                                onClick={unlock.unlock}
                                disabled={unlock.isPending}
                                className="min-h-10 text-sm font-semibold text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-50"
                            >
                                {t('host.unlock')}
                            </button>
                        )}
                        {unlock.errorMessage && <p className="pt-1 text-sm text-destructive">{unlock.errorMessage}</p>}
                    </div>
                )}
            </RoleSheet>

            {/* Clear confirmation */}
            <ConfirmActionModal
                open={form.confirmingClear}
                onCloseAction={form.cancelClear}
                title={t('host.clearTitle', { name: member.displayName })}
                body={t('host.clearBody')}
                cancelLabel={t('host.cancel')}
                confirmLabel={t('host.clearConfirm')}
                isConfirming={form.isClearing}
                onConfirmAction={form.confirmClear}
            />
        </>
    );
}
