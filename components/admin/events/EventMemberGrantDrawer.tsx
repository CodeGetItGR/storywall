'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { EventDrawerFooter } from '@/components/admin/events/EventDrawerFooter';
import { EventGrantReasonField } from '@/components/admin/events/EventGrantReasonField';
import { EventLimitPreview } from '@/components/admin/events/EventLimitPreview';
import { useMemberGrantForm } from '@/hooks/useMemberGrantForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminEventDetailDto } from '@/lib/api/types';

const FORM_ID = 'event-member-grant-form';

export function EventMemberGrantDrawer({ open, event, onCloseAction }: { open: boolean; event: AdminEventDetailDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const form = useMemberGrantForm(event, onCloseAction);
    const current = event.usage.memberLimit;

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            closeLabel={t('cancel')}
            title={t('events.memberGrant.title')}
            subtitle={event.title ?? t('events.untitled')}
            footer={
                <EventDrawerFooter
                    formId={FORM_ID}
                    saveLabel={t('events.memberGrant.save')}
                    canSave={form.canSave}
                    isSaving={form.isSaving}
                    onCancelAction={onCloseAction}
                />
            }
        >
            <form id={FORM_ID} onSubmit={form.handleSubmit} noValidate className="space-y-6">
                {/* Slots */}
                <AdminField label={t('events.memberGrant.field')} hint={form.slotsInvalid ? t('events.memberGrant.invalid') : t('events.memberGrant.hint')}>
                    <input
                        inputMode="numeric"
                        value={form.slots}
                        onChange={form.handleSlotsChange}
                        aria-invalid={form.slotsInvalid}
                        className={adminInputClass(form.slotsInvalid ? 'border-status-danger font-mono' : 'font-mono')}
                    />
                </AdminField>

                {/* Effect */}
                <EventLimitPreview
                    current={current === null ? t('events.limits.unlimited') : current.toLocaleString(locale)}
                    next={form.resultLimit === null ? null : form.resultLimit.toLocaleString(locale)}
                    warning={null}
                />

                {/* Reason */}
                <EventGrantReasonField value={form.reason} invalid={form.reasonInvalid} onChangeAction={form.handleReasonChange} />

                {/* Save error */}
                {Boolean(form.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
