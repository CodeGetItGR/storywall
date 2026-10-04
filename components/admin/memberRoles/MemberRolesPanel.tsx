'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { MemberRoleDrawer } from '@/components/admin/memberRoles/MemberRoleDrawer';
import { MemberRolesTable } from '@/components/admin/memberRoles/MemberRolesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useMemberRolesCatalog } from '@/hooks/useMemberRolesCatalog';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { ROLE_STATUS_FILTERS, type RoleStatusFilter } from '@/lib/memberRoles';
import { cn } from '@/lib/utils';

export function MemberRolesPanel() {
    const t = useTranslations('AdminPage.memberRoles');
    const tAdmin = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const catalog = useMemberRolesCatalog();
    const eventType = catalog.eventTypes.find((item) => item.eventTypeKey === catalog.eventTypeKey);

    function handleStatusClick(event: MouseEvent<HTMLButtonElement>) {
        catalog.setStatus(event.currentTarget.dataset.status as RoleStatusFilter);
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3">
                <AdminField label={t('eventType')} className="min-w-48">
                    <select value={catalog.eventTypeKey ?? ''} onChange={catalog.handleEventTypeChange} className={adminInputClass()}>
                        {catalog.eventTypes.map((item) => (
                            <option key={item.eventTypeKey} value={item.eventTypeKey}>
                                {localizedText(item.name, item.eventTypeKey)}
                            </option>
                        ))}
                    </select>
                </AdminField>
                <button
                    type="button"
                    onClick={catalog.openCreate}
                    disabled={!catalog.eventTypeKey}
                    className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </div>

            {/* Roles */}
            <section className="rounded-xl border border-border bg-card">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input
                            value={catalog.search}
                            onChange={catalog.handleSearchChange}
                            placeholder={t('search')}
                            aria-label={t('search')}
                            className={adminInputClass('w-full pl-8')}
                        />
                    </div>
                    <div className="flex gap-1 rounded-lg bg-canvas p-1">
                        {ROLE_STATUS_FILTERS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                data-status={status}
                                onClick={handleStatusClick}
                                aria-pressed={catalog.status === status}
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                    catalog.status === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                                )}
                            >
                                {t(`filters.${status}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {catalog.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {catalog.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(catalog.error)}`)}</p>}
                {catalog.moveError && (
                    <p className="px-3 pt-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(catalog.moveError)}`)}</p>
                )}
                {!catalog.isLoading && !catalog.error && (
                    <MemberRolesTable
                        roles={catalog.visibleRoles}
                        hasAnyRoles={catalog.roles.length > 0}
                        canReorder={catalog.canReorder}
                        onMoveAction={catalog.moveRole}
                        onEditAction={catalog.openEdit}
                    />
                )}
            </section>

            {/* Drawer */}
            {catalog.drawer.open && catalog.eventTypeKey && (
                <MemberRoleDrawer
                    key={catalog.drawer.role?.id ?? 'new'}
                    role={catalog.drawer.role}
                    eventTypeKey={catalog.eventTypeKey}
                    eventTypeName={eventType ? localizedText(eventType.name, eventType.eventTypeKey) : catalog.eventTypeKey}
                    sortOrder={catalog.createSortOrder}
                    onCloseAction={catalog.closeDrawer}
                />
            )}
        </div>
    );
}
