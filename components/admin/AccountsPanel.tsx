'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AccountCreateDrawer } from '@/components/admin/AccountCreateDrawer';
import { AccountDetailDrawer } from '@/components/admin/AccountDetailDrawer';
import { AccountsTable } from '@/components/admin/AccountsTable';
import { adminInputClass } from '@/components/admin/AdminField';
import { EventProvisionDrawer } from '@/components/admin/EventProvisionDrawer';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAccountsPanel } from '@/hooks/useAccountsPanel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';

export function AccountsPanel() {
    const t = useTranslations('AdminPage.accounts');
    const panel = useAccountsPanel();
    const toErrorMessage = useApiErrorMessage();
    const data = panel.accountsQuery.data;

    function openCreate() {
        panel.setCreateOpen(true);
    }

    function closeCreate() {
        panel.setCreateOpen(false);
    }

    function closeAccount() {
        panel.setSelectedAccount(null);
    }

    function closeProvisioning() {
        panel.setProvisionAccount(null);
    }

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        panel.setSearch(event.target.value);
    }

    return (
        <section className="space-y-6">
            {/* Page heading */}
            <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">{t('title')}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{t('subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                    <Plus className="h-4 w-4" />
                    {t('create.action')}
                </button>
            </header>

            {/* Account search and list */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border p-4">
                    <label className="relative block max-w-sm">
                        <span className="sr-only">{t('searchLabel')}</span>
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input
                            type="search"
                            value={panel.search}
                            onChange={handleSearchChange}
                            placeholder={t('searchPlaceholder')}
                            className={adminInputClass('pl-9')}
                        />
                    </label>
                </div>

                {panel.accountsQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
                {panel.accountsQuery.error ? (
                    <p className="px-5 py-12 text-center text-sm text-status-danger">{toErrorMessage(panel.accountsQuery.error)}</p>
                ) : null}
                {data && data.content.length === 0 ? (
                    <p className="px-5 py-14 text-center text-sm text-ink-muted">{panel.search ? t('noResults') : t('empty')}</p>
                ) : null}
                {data && data.content.length > 0 ? (
                    <AccountsTable
                        data={data}
                        page={panel.page}
                        onPageChangeAction={panel.setPage}
                        onOpenAccountAction={panel.openAccount}
                        onProvisionAction={panel.provisionFor}
                    />
                ) : null}
            </section>

            {panel.createOpen ? <AccountCreateDrawer onCloseAction={closeCreate} onProvisionAction={panel.provisionFor} /> : null}
            {panel.selectedAccount ? (
                <AccountDetailDrawer
                    key={panel.selectedAccount.id}
                    account={panel.selectedAccount}
                    onCloseAction={closeAccount}
                    onProvisionAction={panel.provisionFor}
                />
            ) : null}
            {panel.provisionAccount ? (
                <EventProvisionDrawer key={panel.provisionAccount.id} host={panel.provisionAccount} onCloseAction={closeProvisioning} />
            ) : null}
        </section>
    );
}
