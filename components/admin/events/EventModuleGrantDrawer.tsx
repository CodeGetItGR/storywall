'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { EventDrawerFooter } from '@/components/admin/events/EventDrawerFooter';
import { EventGrantReasonField } from '@/components/admin/events/EventGrantReasonField';
import { useModuleGrantForm } from '@/hooks/useModuleGrantForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';

const FORM_ID = 'event-module-grant-form';

export function EventModuleGrantDrawer({
    open,
    eventId,
    moduleKey,
    moduleName,
    moduleDescription,
    onCloseAction,
}: {
    open: boolean;
    eventId: string;
    moduleKey: string;
    moduleName: string;
    moduleDescription: string;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const form = useModuleGrantForm(eventId, moduleKey, onCloseAction);

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            closeLabel={t('cancel')}
            title={t('events.modules.grantTitle', { module: moduleName })}
            footer={
                <EventDrawerFooter
                    formId={FORM_ID}
                    saveLabel={t('events.modules.grantSave')}
                    canSave={form.canSave}
                    isSaving={form.isSaving}
                    onCancelAction={onCloseAction}
                />
            }
        >
            <form id={FORM_ID} onSubmit={form.handleSubmit} noValidate className="space-y-6">
                {/* What it does and how long it lasts */}
                <div className="space-y-2 rounded-lg border border-border bg-canvas p-4">
                    {moduleDescription && <p className="text-sm text-ink">{moduleDescription}</p>}
                    <p className="text-sm text-ink-muted">{t('events.modules.grantHint')}</p>
                </div>

                {/* Reason */}
                <EventGrantReasonField value={form.reason} invalid={form.reasonInvalid} onChangeAction={form.handleReasonChange} />

                {/* Save error */}
                {Boolean(form.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
