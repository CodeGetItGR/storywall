'use client';

import { Store, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { VendorInviteSheet } from '@/components/vendors/manage/VendorInviteSheet';
import { VendorRow } from '@/components/vendors/manage/VendorRow';
import { VendorSheet } from '@/components/vendors/manage/VendorSheet';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useManageVendors } from '@/hooks/useManageVendors';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { useVendorInvite } from '@/hooks/useVendorInvite';
import { routes } from '@/lib/routes';

export function ManageVendorsScreen() {
    const t = useTranslations('Vendors');
    const { eventId } = useEventRouteContext();
    const vendorsOn = useModuleReadable(eventId, 'vendors');
    const page = useManageVendors(eventId);
    const invite = useVendorInvite(eventId);
    const selectedName = page.selectedVendor?.businessName ?? t('manage.noProfile');
    const resetType = invite.link ? t(`types.${invite.link.vendorType}`) : '';

    return (
        <ModulePageShell maxWidth="2xl" title={t('manage.title')} icon={Store} backLabel={t('manage.back')} backHref={routes.events.feed(eventId)}>
            {!vendorsOn ? (
                <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('manage.unavailable')}</p>
            ) : page.isLoading || invite.isLoading ? (
                <VendorRowsSkeleton rows={4} />
            ) : (
                <>
                    {/* Invite */}
                    {invite.links.length === 0 ? (
                        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('manage.linksEmpty')}</p>
                    ) : (
                        <Button type="button" size="lg" onClick={invite.openInvite} className="w-full sm:w-auto">
                            <UserPlus aria-hidden="true" />
                            {t('manage.invite')}
                        </Button>
                    )}

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

            {/* Invite sheet */}
            <VendorInviteSheet
                open={invite.open}
                links={invite.links}
                link={invite.link}
                qrOpen={invite.qrOpen}
                error={invite.error}
                onCloseAction={invite.closeInvite}
                onPickTypeAction={invite.pickType}
                onToggleQrAction={invite.toggleQr}
                onResetAction={invite.requestReset}
            />

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
                open={invite.resetOpen}
                title={t('manage.resetTitle', { type: resetType })}
                body={t('manage.resetBody')}
                confirmLabel={t('manage.resetConfirm')}
                cancelLabel={t('manage.resetCancel')}
                onCloseAction={invite.cancelReset}
                onConfirmAction={invite.confirmReset}
                isConfirming={invite.isResetting}
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
