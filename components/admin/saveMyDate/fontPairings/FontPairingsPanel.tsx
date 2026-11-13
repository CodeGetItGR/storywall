'use client';

import { useTranslations } from 'next-intl';

import { FontPairingDrawer } from '@/components/admin/saveMyDate/fontPairings/FontPairingDrawer';
import { FontPairingsTable } from '@/components/admin/saveMyDate/fontPairings/FontPairingsTable';
import { SaveMyDatePanelHeader } from '@/components/admin/saveMyDate/SaveMyDatePanelHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { useFontPairingsList } from '@/hooks/useFontPairingsList';
import { useRecordDrawer } from '@/hooks/useRecordDrawer';
import { useSaveMyDateEventTypes } from '@/hooks/useSaveMyDateEventTypes';
import type { AdminFontPairingDto } from '@/lib/adminFontPairings';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// Save my date → Font pairings: the title, text and button fonts the editor offers together.
export function FontPairingsPanel() {
    const t = useTranslations('AdminPage.saveMyDate.fontPairings');
    const tAdmin = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const list = useFontPairingsList();
    const eventTypes = useSaveMyDateEventTypes();
    const { drawer, openDrawer, openCreate, closeDrawer } = useRecordDrawer<AdminFontPairingDto>();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <SaveMyDatePanelHeader title={t('title')} createLabel={t('create')} onCreateAction={openCreate} />

            {/* Pairings */}
            <section className="rounded-xl border border-border bg-card">
                {list.isLoading && <LoadingState label={tCommon('loading')} className="justify-start p-4" />}
                {list.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(list.error)}`)}</p>}
                {list.moveError && <p className="px-4 pt-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(list.moveError)}`)}</p>}
                {list.isLoaded && (
                    <FontPairingsTable
                        pairings={list.pairings}
                        eventTypeLabelOf={eventTypes.labelOf}
                        canReorder={list.canReorder}
                        onMoveAction={list.movePairing}
                        onReorderAction={list.reorderPairing}
                        onEditAction={openDrawer}
                    />
                )}
            </section>

            {/* Drawer */}
            {drawer.open && (
                <FontPairingDrawer
                    key={drawer.token}
                    pairing={drawer.record}
                    createSortOrder={list.createSortOrder}
                    eventTypes={eventTypes.options}
                    onCloseAction={closeDrawer}
                />
            )}
        </div>
    );
}
