'use client';

import { useTranslations } from 'next-intl';

import { AccountAdminActions } from '@/components/admin/AccountAdminActions';
import { AccountStatusPill } from '@/components/admin/AccountStatusPill';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
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
    const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ') || tAccounts('unnamed');

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

            <AccountAdminActions account={account} onCompleteAction={onCloseAction} onProvisionAction={onProvisionAction} />
        </AdminDrawer>
    );
}
