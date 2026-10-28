'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { PhonePushPill } from '@/components/admin/phones/PhonePushPill';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePhoneRemoval } from '@/hooks/usePhoneRemoval';
import { ADMIN_DEVICE_DATE_FORMAT } from '@/lib/adminDevices';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminDeviceDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

// One paired phone. Removing it lives here, behind a confirmation. The panel remounts it (key) on every opening.
export function PhoneDetailDrawer({ open, device, onCloseAction }: { open: boolean; device: AdminDeviceDto | null; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const r = usePhoneRemoval(device, onCloseAction);

    return (
        <>
            <AdminDrawer
                open={open}
                onClose={onCloseAction}
                closeLabel={t('phones.close')}
                closeDisabled={r.removing}
                title={device?.name ?? ''}
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
                {device && (
                    <dl className="divide-y divide-border rounded-lg border border-border text-sm">
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.paired')}</dt>
                            <dd className="font-mono text-xs text-ink">{formatDate(locale, device.createdAt, ADMIN_DEVICE_DATE_FORMAT)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.lastSeen')}</dt>
                            <dd className="text-ink">
                                {device.lastSeenAt ? (
                                    <span className="font-mono text-xs">{formatDate(locale, device.lastSeenAt, ADMIN_DEVICE_DATE_FORMAT)}</span>
                                ) : (
                                    t('phones.never')
                                )}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <dt className="text-ink-muted">{t('phones.columns.notifications')}</dt>
                            <dd>
                                <PhonePushPill enabled={device.pushEnabled} />
                            </dd>
                        </div>
                    </dl>
                )}

                {/* Errors */}
                {r.error !== null && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(r.error)}`)}</p>}
            </AdminDrawer>

            {/* Remove confirmation */}
            <ConfirmActionModal
                open={r.confirmOpen}
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
