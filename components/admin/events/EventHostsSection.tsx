'use client';

import { useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import type { AdminEventDetailDto } from '@/lib/api/types';

// Who runs the event, primary host first. The account id copies, for the Accounts search.
export function EventHostsSection({ hosts }: { hosts: AdminEventDetailDto['hosts'] }) {
    const t = useTranslations('AdminPage');

    return (
        <OrderCard title={t('events.hosts.title')}>
            {hosts.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('events.noHost')}</p>
            ) : (
                <ul className="space-y-4">
                    {hosts.map((host, index) => (
                        <li key={host.userId ?? `host-${index}`} className="flex items-start gap-3">
                            {/* Name and email */}
                            <div className="min-w-0 flex-1">
                                <p className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-ink">
                                        {host.displayName ?? host.email ?? t('events.hosts.noAccount')}
                                    </span>
                                    {host.primary && (
                                        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-bold text-ink-muted">
                                            {t('events.hosts.primary')}
                                        </span>
                                    )}
                                </p>
                                {host.displayName && host.email && <p className="mt-0.5 truncate text-xs text-ink-muted">{host.email}</p>}
                            </div>

                            {/* Account id */}
                            {host.userId && <AdminIdentifier label={t('events.hosts.account')} value={host.userId} hideValue className="shrink-0" />}
                        </li>
                    ))}
                </ul>
            )}
        </OrderCard>
    );
}
