'use client';

import { Ban, CalendarPlus, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EventCreationAccessControl } from '@/components/admin/EventCreationAccessControl';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAccountAdminActions } from '@/hooks/useAccountAdminActions';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { UserResponseDto } from '@/lib/api/types';

export function AccountAdminActions({
    account,
    onCompleteAction,
    onProvisionAction,
}: {
    account: UserResponseDto;
    onCompleteAction: () => void;
    onProvisionAction: (account: UserResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.accounts');
    const actions = useAccountAdminActions({ account, onCompleteAction });
    const toErrorMessage = useApiErrorMessage();
    const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ') || t('unnamed');
    const isAccessConfirmation = actions.confirmation === 'access';
    const isSuspensionConfirmation = actions.confirmation === 'suspend';
    const isDeleteConfirmation = actions.confirmation === 'delete';

    function provisionEvent() {
        onProvisionAction({ ...account, eventCreationLocked: actions.locked });
    }

    return (
        <>
            {/* Event creation access */}
            <section aria-labelledby="account-access-heading" className="border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 id="account-access-heading" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                        {t('detail.eventCreation')}
                    </h3>
                    {actions.updateAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin text-ink-faint" /> : null}
                </div>
                <EventCreationAccessControl
                    locked={actions.locked}
                    disabled={actions.updateAccount.isPending}
                    onChangeAction={actions.requestAccessChange}
                />
                {actions.saved ? (
                    <p role="status" className="mt-2 text-xs font-semibold text-status-good">
                        {t('detail.saved')}
                    </p>
                ) : null}
                {actions.updateAccount.error ? (
                    <p role="alert" className="mt-2 text-xs font-semibold text-status-danger">
                        {toErrorMessage(actions.updateAccount.error)}
                    </p>
                ) : null}
            </section>

            {/* Account danger actions */}
            {account.status !== 'DELETED' ? (
                <section aria-labelledby="account-danger-heading" className="border-t border-border pt-5">
                    <h3 id="account-danger-heading" className="text-xs font-bold tracking-wide text-status-danger uppercase">
                        {t('danger.title')}
                    </h3>
                    <div className="mt-3 space-y-3">
                        {account.status === 'ACTIVE' ? (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-ink-muted">{t('danger.suspendHint')}</p>
                                <button
                                    type="button"
                                    onClick={actions.requestSuspend}
                                    disabled={actions.updateAccount.isPending}
                                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger-wash disabled:opacity-50"
                                >
                                    <Ban className="h-4 w-4" />
                                    {t('danger.suspend')}
                                </button>
                            </div>
                        ) : null}
                        <div className="flex flex-col gap-3 border-t border-status-danger-wash pt-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-ink-muted">{t('danger.deleteHint')}</p>
                            <button
                                type="button"
                                onClick={actions.requestDelete}
                                disabled={actions.updateAccount.isPending}
                                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger-wash disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('danger.delete')}
                            </button>
                        </div>
                    </div>
                </section>
            ) : null}

            {/* Access confirmation */}
            <ConfirmActionModal
                open={isAccessConfirmation}
                onCloseAction={actions.closeConfirmation}
                title={t(actions.locked ? 'access.confirmAllowTitle' : 'access.confirmRestrictTitle')}
                body={t(actions.locked ? 'access.confirmAllowBody' : 'access.confirmRestrictBody')}
                confirmLabel={t('access.confirm')}
                cancelLabel={t('access.cancel')}
                tone={actions.locked ? 'default' : 'danger'}
                isConfirming={actions.updateAccount.isPending}
                onConfirmAction={actions.confirm}
            />

            {/* Suspension confirmation */}
            <ConfirmActionModal
                open={isSuspensionConfirmation}
                onCloseAction={actions.closeConfirmation}
                title={t('danger.suspendConfirmTitle', { name: displayName })}
                body={t('danger.suspendConfirmBody')}
                confirmLabel={t('danger.suspend')}
                cancelLabel={t('danger.cancel')}
                isConfirming={actions.updateAccount.isPending}
                onConfirmAction={actions.confirm}
            />

            {/* Deletion confirmation */}
            <ConfirmActionModal
                open={isDeleteConfirmation}
                onCloseAction={actions.closeConfirmation}
                title={t('danger.deleteConfirmTitle', { name: displayName })}
                body={t('danger.deleteConfirmBody')}
                confirmLabel={t('danger.delete')}
                cancelLabel={t('danger.cancel')}
                isConfirming={actions.updateAccount.isPending}
                onConfirmAction={actions.confirm}
            />

            {/* Event action */}
            <section className="mt-auto border-t border-border pt-5">
                <button
                    type="button"
                    onClick={provisionEvent}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                >
                    <CalendarPlus className="h-4 w-4" />
                    {t('detail.provision')}
                </button>
            </section>
        </>
    );
}
