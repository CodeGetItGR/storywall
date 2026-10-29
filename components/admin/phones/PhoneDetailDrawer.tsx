'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { PhonePushPill } from '@/components/admin/phones/PhonePushPill';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePhoneRemoval } from '@/hooks/usePhoneRemoval';
import { usePhoneTestNotification } from '@/hooks/usePhoneTestNotification';
import { ADMIN_DEVICE_DATE_FORMAT } from '@/lib/adminDevices';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDeviceDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

// One paired phone, with a test notification. Removing it lives here, behind a confirmation. The panel remounts it (key) on every opening.
export function PhoneDetailDrawer({ open, device, onCloseAction }: { open: boolean; device: AdminDeviceDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const r = usePhoneRemoval(device, onCloseAction);
    const test = usePhoneTestNotification(device);
    // Keeps the details on screen while the drawer slides out after the phone leaves the list.
    const [opened] = useState(device);
    const shown = device ?? opened;

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('phones.close')}
                closeDisabled={r.removing}
                title={shown?.name ?? ''}
                footer={
                    <>
                        {/* Danger */}
                        <button
                            type="button"
                            onClick={r.openConfirmation}
                            disabled={r.removing}
                            className="min-h-9 rounded-md px-3.5 text-sm font-semibold text-status-danger disabled:opacity-50"
                        >
                            {t('phones.remove')}
                        </button>

                        {/* Actions */}
                        <button
                            type="button"
                            onClick={onCloseAction}
                            disabled={r.removing}
                            className="min-h-9 rounded-md border border-border px-3.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                        >
                            {t('phones.close')}
                        </button>
                    </>
                }
            >
                {/* Details */}
                {shown && (
                    <dl className="divide-y divide-border rounded-lg border border-border text-sm">
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.paired')}</dt>
                            <dd className="font-mono text-xs text-ink">{formatDate(locale, shown.createdAt, ADMIN_DEVICE_DATE_FORMAT)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.lastSeen')}</dt>
                            <dd className="text-xs text-ink">
                                {shown.lastSeenAt ? (
                                    <span className="font-mono">{formatDate(locale, shown.lastSeenAt, ADMIN_DEVICE_DATE_FORMAT)}</span>
                                ) : (
                                    t('phones.never')
                                )}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.notifications')}</dt>
                            <dd>
                                <PhonePushPill enabled={shown.pushEnabled} />
                            </dd>
                        </div>
                    </dl>
                )}

                {/* Test */}
                {shown && (
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={test.send}
                            disabled={!shown.pushEnabled || test.sending || r.removing}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3.5 text-sm font-semibold text-ink disabled:opacity-50"
                        >
                            {test.sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('phones.sendTest')}
                        </button>
                        {test.sent && (
                            <p role="status" className="text-sm text-status-good">
                                {t('phones.testSent')}
                            </p>
                        )}
                    </div>
                )}

                {/* Errors */}
                {(r.error ?? test.error) !== null && (
                    <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(r.error ?? test.error)}`)}</p>
                )}
            </AdminDrawer>

            {/* Remove confirmation */}
            <ConfirmActionModal
                open={open && r.confirmOpen}
                title={t('phones.removeTitle')}
                body={t('phones.removeBody')}
                confirmLabel={t('phones.removeConfirm')}
                cancelLabel={t('cancel')}
                tone="danger"
                isConfirming={r.removing}
                onCloseAction={r.closeConfirmation}
                onConfirmAction={r.confirmRemoval}
                icon={r.removing ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}
            />
        </>
    );
}
