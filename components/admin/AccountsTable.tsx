'use client';

import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AccountStatusPill } from '@/components/admin/AccountStatusPill';
import type { Page } from '@/lib/api/pagination';
import type { UserResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function AccountsTable({
    data,
    page,
    onPageChangeAction,
    onOpenAccountAction,
    onProvisionAction,
}: {
    data: Page<UserResponseDto>;
    page: number;
    onPageChangeAction: (page: number) => void;
    onOpenAccountAction: (account: UserResponseDto) => void;
    onProvisionAction: (account: UserResponseDto) => void;
}) {
    const t = useTranslations('AdminPage.accounts');
    const locale = useLocale();
    const pageInfo = data.page;

    function accountForEvent(event: MouseEvent<HTMLButtonElement>) {
        return data.content.find((account) => account.id === event.currentTarget.dataset.accountId);
    }

    function handleOpenAccount(event: MouseEvent<HTMLButtonElement>) {
        const account = accountForEvent(event);
        if (account) onOpenAccountAction(account);
    }

    function handleProvision(event: MouseEvent<HTMLButtonElement>) {
        const account = accountForEvent(event);
        if (account) onProvisionAction(account);
    }

    function goPrevious() {
        onPageChangeAction(page - 1);
    }

    function goNext() {
        onPageChangeAction(page + 1);
    }

    return (
        <>
            {/* Mobile account rows */}
            <div className="divide-y divide-border sm:hidden">
                {data.content.map((account) => {
                    const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ') || t('unnamed');
                    return (
                        <article key={account.id} className="space-y-3 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <button
                                    type="button"
                                    data-account-id={account.id}
                                    onClick={handleOpenAccount}
                                    aria-label={t('openAccount', { name: displayName })}
                                    className="min-w-0 text-left"
                                >
                                    <span className="block truncate font-semibold text-ink">{displayName}</span>
                                    <span className="block truncate text-xs text-ink-faint">{account.email ?? t('noEmail')}</span>
                                </button>
                                <AccountStatusPill status={account.status} />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold text-ink-muted">
                                    {account.eventCreationLocked ? t('access.disabled') : t('access.enabled')}
                                </p>
                                <button
                                    type="button"
                                    data-account-id={account.id}
                                    onClick={handleProvision}
                                    aria-label={t('provisionFor', { name: displayName })}
                                    className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-bold text-primary-dark transition-colors hover:bg-primary-light"
                                >
                                    <CalendarPlus className="h-3.5 w-3.5" />
                                    {t('provision.action')}
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>

            {/* Account rows */}
            <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                            <th className="px-5 py-3 font-bold">{t('columns.account')}</th>
                            <th className="px-3 py-3 font-bold">{t('columns.status')}</th>
                            <th className="px-3 py-3 font-bold">{t('columns.role')}</th>
                            <th className="px-3 py-3 font-bold">{t('columns.eventCreation')}</th>
                            <th className="px-3 py-3 font-bold">{t('columns.created')}</th>
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {data.content.map((account) => {
                            const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ') || t('unnamed');
                            return (
                                <tr key={account.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                    <td className="px-5 py-3.5">
                                        <button
                                            type="button"
                                            data-account-id={account.id}
                                            onClick={handleOpenAccount}
                                            aria-label={t('openAccount', { name: displayName })}
                                            className="block max-w-72 text-left"
                                        >
                                            <span className="block truncate font-semibold text-ink">{displayName}</span>
                                            <span className="block truncate text-xs text-ink-faint">{account.email ?? t('noEmail')}</span>
                                        </button>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <AccountStatusPill status={account.status} />
                                    </td>
                                    <td className="px-3 py-3.5 text-xs font-semibold text-ink-muted">{t(`role.${account.platformRole}`)}</td>
                                    <td className="px-3 py-3.5 text-xs font-semibold text-ink-muted">
                                        {account.eventCreationLocked ? t('access.disabled') : t('access.enabled')}
                                    </td>
                                    <td className="px-3 py-3.5 text-xs text-ink-faint">
                                        {formatDate(locale, account.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <button
                                            type="button"
                                            data-account-id={account.id}
                                            onClick={handleProvision}
                                            aria-label={t('provisionFor', { name: displayName })}
                                            className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-primary-dark transition-colors hover:bg-primary-light"
                                        >
                                            <CalendarPlus className="h-3.5 w-3.5" />
                                            {t('provision.action')}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <footer className="flex items-center justify-between gap-4 border-t border-border px-5 py-3.5">
                <p className="text-xs text-ink-faint">{t('pagination', { count: pageInfo.totalElements })}</p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={page === 0}
                        onClick={goPrevious}
                        aria-label={t('previous')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-20 text-center text-xs font-semibold text-ink-muted">
                        {t('page', { current: pageInfo.number + 1, total: Math.max(1, pageInfo.totalPages) })}
                    </span>
                    <button
                        type="button"
                        disabled={pageInfo.number + 1 >= pageInfo.totalPages}
                        onClick={goNext}
                        aria-label={t('next')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas disabled:opacity-30"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </footer>
        </>
    );
}
