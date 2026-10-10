'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { EventDrawerFooter } from '@/components/admin/events/EventDrawerFooter';
import { EventGrantReasonField } from '@/components/admin/events/EventGrantReasonField';
import { EventLimitPreview } from '@/components/admin/events/EventLimitPreview';
import { useStorageGrantForm } from '@/hooks/useStorageGrantForm';
import { formatGb } from '@/lib/adminEvents';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminEventDetailDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';

const FORM_ID = 'event-storage-grant-form';

export function EventStorageGrantDrawer({ open, event, onCloseAction }: { open: boolean; event: AdminEventDetailDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const form = useStorageGrantForm(event, onCloseAction);
    const { usage } = event;
    const current = usage.storageLimitBytes;
    const breakdown =
        usage.planStorageBytes === null || form.grantedBytes === null
            ? null
            : usage.purchasedExtraStorageBytes > 0
              ? t('events.limits.breakdownWithBought', {
                    plan: formatBytes(usage.planStorageBytes),
                    bought: formatBytes(usage.purchasedExtraStorageBytes),
                    granted: formatGb(form.grantedBytes, locale),
                })
              : t('events.limits.breakdown', { plan: formatBytes(usage.planStorageBytes), granted: formatGb(form.grantedBytes, locale) });

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
                <AdminField label={t('events.storageGrant.field')} hint={form.gbInvalid ? t('events.storageGrant.invalid') : t('events.storageGrant.hint', { current: formatGb(usage.grantedStorageBytes, locale) })}>
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
                    breakdown={breakdown}
                    warning={form.belowUsage ? t('events.storageGrant.belowUsage', { used: formatBytes(usage.storageBytes) }) : null}
                />

                {/* Reason */}
                <EventGrantReasonField value={form.reason} invalid={form.reasonInvalid} onChangeAction={form.handleReasonChange} />

                {/* Save error */}
                {Boolean(form.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
