'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { EventDrawerFooter } from '@/components/admin/events/EventDrawerFooter';
import { EventGrantReasonField } from '@/components/admin/events/EventGrantReasonField';
import { EventLimitPreview } from '@/components/admin/events/EventLimitPreview';
import { useStorageGrantForm } from '@/hooks/useStorageGrantForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminEventDetailDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';

const FORM_ID = 'event-storage-grant-form';

export function EventStorageGrantDrawer({ open, event, onCloseAction }: { open: boolean; event: AdminEventDetailDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const form = useStorageGrantForm(event, onCloseAction);
    const current = event.usage.storageLimitBytes;

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            closeLabel={t('cancel')}
            title={t('events.storageGrant.title')}
            subtitle={event.title ?? t('events.untitled')}
            footer={
                <EventDrawerFooter
                    formId={FORM_ID}
                    saveLabel={t('events.storageGrant.save')}
                    canSave={form.canSave}
                    isSaving={form.isSaving}
                    onCancelAction={onCloseAction}
                />
            }
        >
            <form id={FORM_ID} onSubmit={form.handleSubmit} noValidate className="space-y-6">
                {/* Amount */}
                <AdminField label={t('events.storageGrant.field')} hint={form.gbInvalid ? t('events.storageGrant.invalid') : t('events.storageGrant.hint')}>
                    <div className="relative">
                        <input
                            inputMode="decimal"
                            value={form.gb}
                            onChange={form.handleGbChange}
                            aria-invalid={form.gbInvalid}
                            className={adminInputClass(form.gbInvalid ? 'border-status-danger pr-12 font-mono' : 'pr-12 font-mono')}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-ink-faint">GB</span>
                    </div>
                </AdminField>

                {/* Effect */}
                <EventLimitPreview
                    current={current === null ? t('events.limits.unlimited') : formatBytes(current)}
                    next={form.resultLimit === null ? null : formatBytes(form.resultLimit)}
                    warning={form.belowUsage ? t('events.storageGrant.belowUsage', { used: formatBytes(event.usage.storageBytes) }) : null}
                />

                {/* Reason */}
                <EventGrantReasonField value={form.reason} invalid={form.reasonInvalid} onChangeAction={form.handleReasonChange} />

                {/* Save error */}
                {Boolean(form.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
