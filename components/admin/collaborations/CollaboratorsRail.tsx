'use client';

import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { AdminRailItem } from '@/components/admin/AdminRailItem';
import { AdminRailSearch } from '@/components/admin/AdminRailSearch';
import { formatCurrencyAmounts, owedAmounts } from '@/lib/adminCollaborations';
import type { CollaboratorResponseDto } from '@/lib/api/types';

export function CollaboratorsRail({
    collaborators,
    selectedId,
    search,
    onSearchChangeAction,
    onSelectAction,
    onCreateAction,
}: {
    collaborators: CollaboratorResponseDto[];
    selectedId: string | null;
    search: string;
    onSearchChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onSelectAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onCreateAction: () => void;
}) {
    const t = useTranslations('AdminPage.collaborations');
    const locale = useLocale();

    return (
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-52">
            {/* Search */}
            <AdminRailSearch value={search} placeholder={t('search')} onChangeAction={onSearchChangeAction} />

            {/* Partners */}
            <nav aria-label={t('title')} className="space-y-px">
                {collaborators.map((collaborator) => (
                    <AdminRailItem
                        key={collaborator.id}
                        data-collaborator-id={collaborator.id}
                        active={collaborator.id === selectedId}
                        muted={collaborator.status === 'SUSPENDED'}
                        onClick={onSelectAction}
                    >
                        <span className="truncate">{collaborator.name}</span>
                        {/* The selected partner's owed amount lives in the pane's Earnings section. */}
                        {collaborator.id !== selectedId && (
                            <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                                {formatCurrencyAmounts(locale, owedAmounts(collaborator.earningsTotals))}
                            </span>
                        )}
                    </AdminRailItem>
                ))}
                {collaborators.length === 0 && search.trim() && <p className="px-2.5 py-2 text-xs text-ink-faint">{t('noMatches')}</p>}
            </nav>

            {/* Create */}
            <div className="border-t border-border pt-3">
                <AdminRailItem active={false} onClick={onCreateAction}>
                    <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t('create')}
                    </span>
                </AdminRailItem>
            </div>
        </aside>
    );
}
