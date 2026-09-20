'use client';

import { CalendarPlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { AccountStatusPill } from '@/components/admin/AccountStatusPill';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { EventCreationAccessControl } from '@/components/admin/EventCreationAccessControl';
import { useUpdateAdminAccountMutation } from '@/hooks/useAdminAccounts';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { UserResponseDto } from '@/lib/api/types';

export function AccountDetailDrawer({
    account,
    onCloseAction,
    onProvisionAction,
}: {
    account: UserResponseDto;
    onCloseAction: () => void;
    onProvisionAction: (account: UserResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.accounts.detail');
    const tAccounts = useTranslations('AdminPage.accounts');
    const updateAccount = useUpdateAdminAccountMutation();
    const toErrorMessage = useApiErrorMessage();
    const [locked, setLocked] = useState(account.eventCreationLocked);
    const [saved, setSaved] = useState(false);
    const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ') || tAccounts('unnamed');

    async function changeAccess(nextLocked: boolean) {
        const previous = locked;
        setLocked(nextLocked);
        setSaved(false);
        try {
            await updateAccount.mutateAsync({ id: account.id, input: { eventCreationLocked: nextLocked } });
            setSaved(true);
        } catch {
            setLocked(previous);
        }
    }

    function handleProvision() {
        onProvisionAction({ ...account, eventCreationLocked: locked });
    }

    return (
        <AdminDrawer open onClose={onCloseAction} closeLabel={t('close')} title={displayName} subtitle={account.email ?? tAccounts('noEmail')}>
            {/* Account */}
            <section aria-labelledby="account-detail-heading" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 id="account-detail-heading" className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                        {t('account')}
                    </h3>
                    <AccountStatusPill status={account.status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                    <div>
                        <dt className="text-xs text-ink-faint">{t('role')}</dt>
                        <dd className="mt-1 font-semibold text-ink">{tAccounts(`role.${account.platformRole}`)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-ink-faint">{t('verified')}</dt>
                        <dd className="mt-1 font-semibold text-ink">{account.emailVerified ? t('yes') : t('no')}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-ink-faint">{t('provider')}</dt>
                        <dd className="mt-1 font-mono text-xs text-ink-muted">{account.authProvider}</dd>
                    </div>
                    <AdminIdentifier label={t('accountId')} value={account.id} />
                </dl>
            </section>

            {/* Access */}
            <section aria-labelledby="account-access-heading" className="border-t border-border pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 id="account-access-heading" className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                        {t('eventCreation')}
                    </h3>
                    {updateAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin text-ink-faint" /> : null}
                </div>
                <EventCreationAccessControl locked={locked} disabled={updateAccount.isPending} onChangeAction={changeAccess} />
                {saved ? (
                    <p role="status" className="mt-2 text-xs font-semibold text-status-good">
                        {t('saved')}
                    </p>
                ) : null}
                {updateAccount.error ? (
                    <p role="alert" className="mt-2 text-xs font-semibold text-status-danger">
                        {toErrorMessage(updateAccount.error)}
                    </p>
                ) : null}
            </section>

            {/* Event action */}
            <section className="mt-auto border-t border-border pt-5">
                <button
                    type="button"
                    onClick={handleProvision}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                >
                    <CalendarPlus className="h-4 w-4" />
                    {t('provision')}
                </button>
            </section>
        </AdminDrawer>
    );
}
