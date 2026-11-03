'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { ShopSyncPill } from '@/components/admin/shop/ShopSyncPill';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { AdminShopStoreDto } from '@/lib/api/types';

const PILL = 'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold';

export function ShopStoresTable({
    query,
    onAddAction,
    onOpenAction,
}: {
    query: UseQueryResult<AdminShopStoreDto[]>;
    onAddAction: () => void;
    onOpenAction: (store: AdminShopStoreDto) => void;
}) {
    const t = useTranslations('AdminPage.shop');
    const toErrorMessage = useApiErrorMessage();
    const stores = query.data ?? [];

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const found = stores.find((item) => item.id === event.currentTarget.dataset.storeId);
        if (found) onOpenAction(found);
    }

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">{t('stores.title')}</h3>
                <button
                    type="button"
                    onClick={onAddAction}
                    className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white"
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    {t('stores.add')}
                </button>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {query.isLoading && <LoadingState className="justify-start px-5 py-6" />}
                {query.error ? <p className="px-5 py-6 text-sm text-status-danger">{toErrorMessage(query.error)}</p> : null}
                {query.data && stores.length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">{t('stores.empty')}</p>}
                {stores.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-sm">
                            {/* Columns */}
                            <thead>
                                <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                    <th className="px-5 py-3 font-bold">{t('stores.name')}</th>
                                    <th className="px-3 py-3 font-bold">{t('stores.domain')}</th>
                                    <th className="px-3 py-3 text-right font-bold">{t('stores.products')}</th>
                                    <th className="px-3 py-3 font-bold">{t('stores.status')}</th>
                                    <th className="px-5 py-3 font-bold">{t('visibility')}</th>
                                </tr>
                            </thead>

                            {/* Rows */}
                            <tbody>
                                {stores.map((store) => (
                                    <tr key={store.id} className="border-b border-border last:border-b-0 hover:bg-canvas/55">
                                        <td className="px-5 py-3.5">
                                            <button
                                                type="button"
                                                data-store-id={store.id}
                                                onClick={handleOpen}
                                                className="text-left font-semibold text-ink hover:underline"
                                            >
                                                {store.name}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3.5 font-mono text-xs whitespace-nowrap text-ink-muted">{store.shopDomain}</td>
                                        <td className="px-3 py-3.5 text-right font-mono text-xs text-ink">{store.productCount}</td>
                                        <td className="px-3 py-3.5">
                                            <ShopSyncPill store={store} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`${PILL} ${store.isVisible ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-status-neutral'}`}
                                            >
                                                {store.isVisible ? t('shown') : t('hidden')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
