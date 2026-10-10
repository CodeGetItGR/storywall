'use client';

import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AccountAdminActions } from '@/components/admin/AccountAdminActions';
import { AccountEmailSection } from '@/components/admin/AccountEmailSection';
import { AccountEventsSection } from '@/components/admin/AccountEventsSection';
import { AccountStatusPill } from '@/components/admin/AccountStatusPill';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import type { UserResponseDto } from '@/lib/api/types';

export function AccountDetailDrawer({
    account,
    onCloseAction,
    onProvisionAction,
    onAccountChangedAction,
}: {
    account: UserResponseDto;
    onCloseAction: () => void;
    onProvisionAction: (account: UserResponseDto) => void;
    onAccountChangedAction: (account: UserResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.accounts.detail');
    const tAccounts = useTranslations('AdminPage.accounts');
    const { sendTo } = useAdminNavigation();
    const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ') || tAccounts('unnamed');

    function openOrders() {
        sendTo('orders', { buyerId: account.id, buyerLabel: account.email ?? displayName });
    }

    return (
        <AdminDrawer open onClose={onCloseAction} closeLabel={t('close')} title={displayName} subtitle={account.email ?? tAccounts('noEmail')}>
            {/* Account */}
            <section aria-labelledby="account-detail-heading" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 id="account-detail-heading" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
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
                <button
                    type="button"
                    onClick={openOrders}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
                >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    {t('orders')}
                </button>
            </section>

            {/* Events */}
            <AccountEventsSection account={account} hostLabel={account.email ?? displayName} />

            {/* Email */}
            {account.status !== 'DELETED' ? <AccountEmailSection account={account} onChangedAction={onAccountChangedAction} /> : null}

            <AccountAdminActions account={account} onCompleteAction={onCloseAction} onProvisionAction={onProvisionAction} />
        </AdminDrawer>
    );
}
