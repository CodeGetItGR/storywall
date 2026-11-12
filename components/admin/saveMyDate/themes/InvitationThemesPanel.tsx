'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import { InvitationThemeDrawer } from '@/components/admin/saveMyDate/themes/InvitationThemeDrawer';
import { InvitationThemeNameModal } from '@/components/admin/saveMyDate/themes/InvitationThemeNameModal';
import { InvitationThemePreviewOverlay } from '@/components/admin/saveMyDate/themes/InvitationThemePreviewOverlay';
import { InvitationThemeSegmented } from '@/components/admin/saveMyDate/themes/InvitationThemeSegmented';
import { InvitationThemesTable } from '@/components/admin/saveMyDate/themes/InvitationThemesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useInvitationThemesCatalog } from '@/hooks/useInvitationThemesCatalog';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// Save my date → Themes: every theme, whatever its status, with one drawer to edit one.
export function InvitationThemesPanel() {
    const t = useTranslations('AdminPage.invitationThemes');
    const tAdmin = useTranslations('AdminPage');
    const catalog = useInvitationThemesCatalog();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                </div>
                <button
                    type="button"
                    onClick={catalog.openCreate}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('create')}
                </button>
            </header>

            {/* Themes */}
            <section className="rounded-xl border border-border bg-card">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 basis-full sm:max-w-64 sm:flex-1 sm:basis-auto">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                        <input
                            type="search"
                            value={catalog.search}
                            onChange={catalog.handleSearchChange}
                            placeholder={t('search')}
                            aria-label={t('search')}
                            className={adminInputClass('w-full pl-8')}
                        />
                    </div>
                    {/* One event type needs no filter */}
                    {catalog.eventTypeFilterOptions.length > 2 && (
                        <InvitationThemeSegmented
                            label={t('columns.eventType')}
                            options={catalog.eventTypeFilterOptions}
                            value={catalog.eventType}
                            onChangeAction={catalog.setEventType}
                        />
                    )}
                    <InvitationThemeSegmented label={t('columns.status')} options={catalog.statusFilterOptions} value={catalog.status} onChangeAction={catalog.setStatus} />
                </div>

                {/* Table */}
                {catalog.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {catalog.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(catalog.error)}`)}</p>}
                {!catalog.isLoading && !catalog.error && (
                    <InvitationThemesTable
                        themes={catalog.visibleThemes}
                        hasAnyThemes={catalog.themes.length > 0}
                        eventTypeLabels={catalog.eventTypeLabels}
                        onEditAction={catalog.openDrawer}
                        onPreviewAction={catalog.openPreview}
                    />
                )}
            </section>

            {/* Drawer */}
            {catalog.drawerThemeId && (
                <InvitationThemeDrawer
                    key={catalog.drawerThemeId}
                    themeId={catalog.drawerThemeId}
                    title={catalog.drawerTitle}
                    eventTypes={catalog.createEventTypes}
                    onCloseAction={catalog.closeDrawer}
                    onDuplicateAction={catalog.openDuplicate}
                    onPreviewAction={catalog.openPreview}
                />
            )}

            {/* New theme and duplicate */}
            {catalog.nameModal && (
                <InvitationThemeNameModal
                    key={catalog.nameModal.mode === 'duplicate' ? catalog.nameModal.sourceId : 'create'}
                    state={catalog.nameModal}
                    themes={catalog.themes}
                    eventTypes={catalog.createEventTypes}
                    onCloseAction={catalog.closeNameModal}
                    onNamedAction={catalog.handleNamed}
                />
            )}

            {/* Preview */}
            {catalog.previewThemeId && (
                <InvitationThemePreviewOverlay key={catalog.previewThemeId} themeId={catalog.previewThemeId} onCloseAction={catalog.closePreview} />
            )}
        </div>
    );
}
