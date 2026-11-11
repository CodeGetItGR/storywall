'use client';

import { useTranslations } from 'next-intl';

import { SaveMyDatePanelHeader } from '@/components/admin/saveMyDate/SaveMyDatePanelHeader';
import { InvitationTextDrawer } from '@/components/admin/saveMyDate/texts/InvitationTextDrawer';
import { InvitationTextsTable } from '@/components/admin/saveMyDate/texts/InvitationTextsTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminInvitationTexts } from '@/hooks/useAdminInvitationTexts';
import { useRecordDrawer } from '@/hooks/useRecordDrawer';
import { useSaveMyDateEventTypes } from '@/hooks/useSaveMyDateEventTypes';
import type { AdminInvitationTextDto } from '@/lib/adminInvitationTexts';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// Save my date → Texts: ready-made wording the invitation editor offers, per event type and language.
export function InvitationTextsPanel() {
    const t = useTranslations('AdminPage.saveMyDate.texts');
    const tAdmin = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const textsQuery = useAdminInvitationTexts();
    const eventTypes = useSaveMyDateEventTypes();
    const { drawer, openDrawer, openCreate, closeDrawer } = useRecordDrawer<AdminInvitationTextDto>();

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <SaveMyDatePanelHeader title={t('title')} createLabel={t('create')} onCreateAction={openCreate} />

            {/* Texts */}
            <section className="rounded-xl border border-border bg-card">
                {textsQuery.isLoading && <LoadingState label={tCommon('loading')} className="justify-start p-4" />}
                {textsQuery.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(textsQuery.error)}`)}</p>}
                {textsQuery.data && <InvitationTextsTable texts={textsQuery.data} eventTypeLabelOf={eventTypes.labelOf} onEditAction={openDrawer} />}
            </section>

            {/* Drawer */}
            {drawer.open && <InvitationTextDrawer key={drawer.token} text={drawer.record} eventTypes={eventTypes.options} onCloseAction={closeDrawer} />}
        </div>
    );
}
