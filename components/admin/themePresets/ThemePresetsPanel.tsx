'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { ThemePresetDrawer } from '@/components/admin/themePresets/ThemePresetDrawer';
import { ThemePresetsTable } from '@/components/admin/themePresets/ThemePresetsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useThemePresetsCatalog } from '@/hooks/useThemePresetsCatalog';
import { THEME_PRESET_STATUS_FILTERS, type ThemePresetStatusFilter } from '@/lib/adminThemePresets';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { cn } from '@/lib/utils';

export function ThemePresetsPanel() {
    const t = useTranslations('AdminPage.themePresets');
    const tAdmin = useTranslations('AdminPage');
    const catalog = useThemePresetsCatalog();

    function handleStatusClick(event: MouseEvent<HTMLButtonElement>) {
        catalog.setStatus(event.currentTarget.dataset.status as ThemePresetStatusFilter);
    }

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{t('subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={catalog.openCreate}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </header>

            {/* Presets */}
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
                    <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                        {THEME_PRESET_STATUS_FILTERS.map((status) => (
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
                    <ThemePresetsTable
                        presets={catalog.visiblePresets}
                        hasAnyPresets={catalog.presets.length > 0}
                        eventTypeLabels={catalog.eventTypeLabels}
                        canReorder={catalog.canReorder}
                        onMoveAction={catalog.movePreset}
                        onEditAction={catalog.openEdit}
                    />
                )}
            </section>

            {/* Drawer */}
            {catalog.drawer.open && (
                <ThemePresetDrawer
                    key={catalog.drawer.preset?.id ?? 'new'}
                    preset={catalog.drawer.preset}
                    sortOrder={catalog.createSortOrder}
                    eventTypes={catalog.eventTypes}
                    onCloseAction={catalog.closeDrawer}
                />
            )}
        </div>
    );
}
