'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useShopCollectionGroup } from '@/hooks/useShopCollectionGroup';
import type { AdminShopCategoryMappingDto, AdminShopStoreDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// One store's collections in the category drawer: a header that opens the group, then a
// searchable checkbox list.
export function ShopCollectionGroup({
    store,
    selected,
    atLimit,
    isSelected,
    onToggleAction,
}: {
    store: Pick<AdminShopStoreDto, 'id' | 'name'>;
    selected: AdminShopCategoryMappingDto[];
    atLimit: boolean;
    isSelected: (storeId: string, collectionGid: string) => boolean;
    onToggleAction: (storeId: string, collection: { gid: string; title: string }) => void;
}) {
    const t = useTranslations('AdminPage.shop.categories');
    const toErrorMessage = useApiErrorMessage();
    const group = useShopCollectionGroup(store.id, selected);
    const listId = `shop-collections-${store.id}`;

    function handleToggle(event: ChangeEvent<HTMLInputElement>) {
        const option = group.optionFor(event.currentTarget.value);
        if (option) onToggleAction(store.id, option);
    }

    return (
        <div className="border-b border-border last:border-b-0">
            {/* Store header */}
            <button
                type="button"
                aria-expanded={group.expanded}
                aria-controls={listId}
                onClick={group.toggleExpanded}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-canvas/60"
            >
                <span className="truncate text-sm font-semibold text-ink">{store.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-ink-muted">{selected.length}</span>
                    <ChevronDown aria-hidden="true" className={cn('h-4 w-4 text-ink-faint transition-transform', group.expanded && 'rotate-180')} />
                </span>
            </button>

            {/* Collections */}
            {group.expanded && (
                <div id={listId} className="space-y-2 px-3 pb-3">
                    <input
                        type="search"
                        aria-label={t('searchCollections')}
                        placeholder={t('searchCollections')}
                        className={adminInputClass()}
                        value={group.search}
                        onChange={group.handleSearchChange}
                    />
                    {group.isLoading && <LoadingState className="justify-start py-3" />}
                    {group.error ? <p className="text-sm text-status-danger">{toErrorMessage(group.error)}</p> : null}
                    {group.isEmpty && <p className="py-2 text-sm text-ink-muted">{t('noCollections')}</p>}
                    {group.options.length > 0 && (
                        <ul className="max-h-64 overflow-y-auto">
                            {group.options.map((option) => {
                                const checked = isSelected(store.id, option.gid);
                                return (
                                    <li key={option.gid}>
                                        <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-canvas/60">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 shrink-0 accent-primary"
                                                value={option.gid}
                                                checked={checked}
                                                disabled={!checked && atLimit}
                                                onChange={handleToggle}
                                            />
                                            <span className="min-w-0 flex-1 truncate text-sm text-ink">{option.title}</span>
                                            {option.handle && <span className="shrink-0 font-mono text-xs text-ink-faint">{option.handle}</span>}
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
