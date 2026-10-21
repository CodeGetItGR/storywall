'use client';

import { Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { VendorLinkQrModal } from '@/components/vendors/manage/VendorLinkQrModal';
import { VendorLinkRow } from '@/components/vendors/manage/VendorLinkRow';
import { VendorRow } from '@/components/vendors/manage/VendorRow';
import { VendorSheet } from '@/components/vendors/manage/VendorSheet';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useManageVendors } from '@/hooks/useManageVendors';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { routes } from '@/lib/routes';

export function ManageVendorsScreen() {
    const t = useTranslations('Vendors');
    const { eventId } = useEventRouteContext();
    const vendorsOn = useModuleReadable(eventId, 'vendors');
    const page = useManageVendors(eventId);
    const selectedName = page.selectedVendor?.businessName ?? t('manage.noProfile');

    return (
        <ModulePageShell maxWidth="2xl" title={t('manage.title')} icon={Store} backLabel={t('manage.back')} backHref={routes.events.feed(eventId)}>
            {!vendorsOn ? (
                <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('manage.unavailable')}</p>
            ) : page.isLoading ? (
                <VendorRowsSkeleton rows={4} />
            ) : (
                <>
                    {/* Error */}
                    {page.error && !page.selectedVendor && (
                        <p role="alert" className="mb-4 text-sm text-rose-600">
                            {page.error}
                        </p>
                    )}

                    {/* Links */}
                    <section aria-labelledby="vendor-links-title">
                        <h2 id="vendor-links-title" className="mb-3 text-sm font-semibold text-ink">
                            {t('manage.linksTitle')}
                        </h2>
                        {page.links.length === 0 ? (
                            <p className="text-sm text-ink-muted">{t('manage.linksEmpty')}</p>
                        ) : (
                            <ul className="flex flex-col divide-y divide-border">
                                {page.links.map((link) => (
                                    <VendorLinkRow key={link.vendorType} link={link} onQrAction={page.openQr} onResetAction={page.requestReset} />
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Joined */}
                    <section aria-labelledby="vendor-joined-title" className="mt-8">
                        <h2 id="vendor-joined-title" className="mb-1 text-sm font-semibold text-ink">
                            {t('manage.joinedTitle')}
                        </h2>
                        {page.vendors.length === 0 ? (
                            <p className="mt-2 text-sm text-ink-muted">{t('manage.joinedEmpty')}</p>
                        ) : (
                            <ul className="flex flex-col divide-y divide-border">
                                {page.vendors.map((vendor) => (
                                    <VendorRow key={vendor.id} vendor={vendor} onOpenAction={page.openVendor} />
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}

            {/* QR */}
            <VendorLinkQrModal link={page.qrLink} onCloseAction={page.closeQr} />

            {/* Vendor sheet */}
            <VendorSheet
                vendor={page.selectedVendor}
                error={page.error}
                isPatching={page.isPatching}
                onCloseAction={page.closeVendor}
                onToggleHiddenAction={page.toggleHidden}
                onRemoveAction={page.requestRemove}
            />

            {/* Reset confirmation */}
            <ConfirmActionModal
                open={page.resetType !== null}
                title={page.resetType ? t('manage.resetTitle', { type: t(`types.${page.resetType}`) }) : ''}
                body={t('manage.resetBody')}
                confirmLabel={t('manage.resetConfirm')}
                cancelLabel={t('manage.resetCancel')}
                onCloseAction={page.cancelReset}
                onConfirmAction={page.confirmReset}
                isConfirming={page.isResetting}
            />

            {/* Remove confirmation */}
            <ConfirmActionModal
                open={page.removeOpen}
                title={t('manage.removeTitle', { name: selectedName })}
                body={t('manage.removeBody')}
                confirmLabel={t('manage.removeConfirm')}
                cancelLabel={t('manage.removeCancel')}
                onCloseAction={page.cancelRemove}
                onConfirmAction={page.confirmRemove}
                isConfirming={page.isRemoving}
            />
        </ModulePageShell>
    );
}
