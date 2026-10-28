'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { PhonePairingCode } from '@/components/admin/phones/PhonePairingCode';
import { usePhoneCreateForm } from '@/hooks/usePhoneCreateForm';
import { ADMIN_DEVICE_NAME_MAX } from '@/lib/adminDevices';
import { adminErrorMessageKey } from '@/lib/adminUtils';

const FORM_ID = 'phone-create-form';

// Name the phone, then show its pairing code once. The panel remounts it (key) on every opening.
export function PhoneCreateDrawer({ open, onCloseAction }: { open: boolean; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const f = usePhoneCreateForm();

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeLabel={t('cancel')}
            closeDisabled={f.busy}
            title={t('phones.createTitle')}
            footer={
                <>
                    <div />

                    {/* Actions */}
                    {f.created ? (
                        <button type="button" onClick={onCloseAction} className="min-h-9 rounded-md bg-ink px-3.5 text-sm font-semibold text-white">
                            {t('phones.done')}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onCloseAction}
                                disabled={f.busy}
                                className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                form={FORM_ID}
                                disabled={f.busy}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {f.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('phones.create')}
                            </button>
                        </div>
                    )}
                </>
            }
        >
            {f.created && f.pairingPayload ? (
                <PhonePairingCode name={f.created.device.name} payload={f.pairingPayload} />
            ) : (
                <form id={FORM_ID} onSubmit={f.handleSubmit} className="space-y-5">
                    {/* Name */}
                    <AdminField label={t('phones.fields.name')} required>
                        <input
                            name="name"
                            aria-label={t('phones.fields.name')}
                            autoComplete="off"
                            className={adminInputClass()}
                            maxLength={ADMIN_DEVICE_NAME_MAX}
                            value={f.name}
                            onChange={f.handleNameChange}
                        />
                    </AdminField>

                    {/* Errors */}
                    {f.problem && <p className="text-sm text-status-danger">{t(`phones.problems.${f.problem}`)}</p>}
                    {f.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(f.error)}`)}</p>}
                </form>
            )}
        </AdminDrawer>
    );
}
