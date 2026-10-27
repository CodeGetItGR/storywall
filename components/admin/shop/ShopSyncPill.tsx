'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { AdminShopStoreDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const PILL = 'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap';
const SYNCED_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

// A store's last sync: failed (the error on hover), synced at a time, or not synced yet.
export function ShopSyncPill({ store }: { store: Pick<AdminShopStoreDto, 'lastSyncedAt' | 'lastSyncError'> }) {
    const t = useTranslations('AdminPage.shop.stores');
    const locale = useLocale();

    if (store.lastSyncError) {
        return (
            <span title={store.lastSyncError} className={cn(PILL, 'bg-status-danger-wash text-status-danger')}>
                {t('syncFailed')}
            </span>
        );
    }
    if (!store.lastSyncedAt) {
        return <span className={cn(PILL, 'bg-status-neutral-wash text-status-neutral')}>{t('syncing')}</span>;
    }
    return (
        <span className={cn(PILL, 'bg-status-good-wash text-status-good')}>
            {t('synced', { time: formatDate(locale, store.lastSyncedAt, SYNCED_FORMAT) })}
        </span>
    );
}
