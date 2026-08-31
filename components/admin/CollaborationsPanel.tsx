'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import { AdminStatTile } from '@/components/admin/AdminStatTile';
import { CollaboratorDrawer } from '@/components/admin/CollaboratorDrawer';
import { CollaboratorOperationsDrawer } from '@/components/admin/CollaboratorOperationsDrawer';
import { CollaboratorsCatalogTable } from '@/components/admin/CollaboratorsCatalogTable';
import { useAdminCollaborators } from '@/hooks/useAdmin';
import { type CollaboratorStatusFilter, useCollaborationsAdmin } from '@/hooks/useCollaborationsAdmin';
import type { CollaboratorResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const EMPTY_COLLABORATORS: CollaboratorResponseDto[] = [];
const STATUS_FILTERS: CollaboratorStatusFilter[] = ['ALL', 'ACTIVE', 'SUSPENDED'];

export function CollaborationsPanel() {
    const t = useTranslations('AdminPage.collaborations');
    const tAdmin = useTranslations('AdminPage');
    const collaboratorsQuery = useAdminCollaborators();
    const collaborators = collaboratorsQuery.data ?? EMPTY_COLLABORATORS;
    const state = useCollaborationsAdmin(collaborators);

    return (
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 text-[15px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-dark">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{t('subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={state.openCreateCollaborator}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </header>

            {/* Stats */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <AdminStatTile label={t('stats.total')} value={state.stats.total} />
                <AdminStatTile label={t('stats.active')} value={state.stats.active} accent="text-status-good" />
                <AdminStatTile label={t('stats.suspended')} value={state.stats.suspended} accent="text-status-neutral" />
                <AdminStatTile label={t('stats.portalLinks')} value={state.stats.portalLinks} accent="text-primary-dark" />
            </div>

            {/* Partners catalog */}
            <section className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-72">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input value={state.search} onChange={state.handleSearchChange} placeholder={t('search')} className={adminInputClass('w-full pl-8')} />
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                        {STATUS_FILTERS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                data-status={status}
                                onClick={state.handleStatusFilterClick}
                                aria-pressed={state.statusFilter === status}
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                    state.statusFilter === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted'
                                )}
                            >
                                {status === 'ALL' ? t('status.ALL') : t(`status.${status}`)}
                            </button>
                        ))}
                    </div>
                    <p className="ml-auto shrink-0 text-xs font-semibold text-ink-faint">
                        {t('rowCount', { shown: state.visibleCollaborators.length, total: collaborators.length })}
                    </p>
                </div>
                <CollaboratorsCatalogTable
                    collaborators={state.visibleCollaborators}
                    isLoading={collaboratorsQuery.isLoading}
                    error={collaboratorsQuery.error}
                    onEditAction={state.openEditCollaborator}
                    onManageAction={state.openPartnerDrawer}
                />
            </section>

            <CollaboratorDrawer
                key={state.editingCollaborator?.id ?? 'new-collaborator'}
                open={state.collaboratorDrawerOpen}
                collaborator={state.editingCollaborator}
                onCloseAction={state.closeCollaboratorDrawer}
            />
            <CollaboratorOperationsDrawer
                open={state.partnerDrawerOpen}
                collaborator={state.managingCollaborator}
                onCloseAction={state.closePartnerDrawer}
                onEditAction={state.openEditManagedCollaborator}
            />
        </div>
    );
}
