'use client';

import { useTranslations } from 'next-intl';

import { ManagePageFrame } from '@/components/manage/nav/ManagePageFrame';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { VendorCapabilities } from '@/components/vendors/manage/VendorCapabilities';
import { VendorInviteSheet } from '@/components/vendors/manage/VendorInviteSheet';
import { VendorSheet } from '@/components/vendors/manage/VendorSheet';
import { VendorsJoined } from '@/components/vendors/manage/VendorsJoined';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useManageVendors } from '@/hooks/useManageVendors';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { useVendorCapabilities } from '@/hooks/useVendorCapabilities';
import { useVendorInvite } from '@/hooks/useVendorInvite';
import { useVendorSeats } from '@/hooks/useVendorSeats';

export function ManageVendorsScreen() {
    const t = useTranslations('Vendors');
    const { eventId } = useEventRouteContext();
    const vendorsOn = useModuleReadable(eventId, 'vendors');
    const page = useManageVendors(eventId);
    const invite = useVendorInvite(eventId);
    const seats = useVendorSeats(eventId, page.vendors.length);
    const removeName = page.removeTarget?.businessName ?? t('manage.noProfile');
    const resetType = invite.link ? t(`types.${invite.link.vendorType}`) : '';
    const capabilities = useVendorCapabilities(eventId);
    // Shown instead of the Invite button.
    const inviteNotice = seats.fullNotice ?? (invite.links.length === 0 ? t('manage.linksEmpty') : null);

    return (
        <ManagePageFrame active="vendors" wide>
            {!vendorsOn ? (
                <p className="rounded-[20px] bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('manage.unavailable')}</p>
            ) : (
                <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-12">
                    {/* Joined */}
                    {page.isLoading || invite.isLoading ? (
                        <VendorRowsSkeleton rows={4} />
                    ) : (
                        <VendorsJoined
                            vendors={page.vendors}
                            listError={page.listError}
                            patchingVendorId={page.patchingVendorId}
                            seats={seats}
                            notice={inviteNotice}
                            onInviteAction={invite.openInvite}
                            onOpenAction={page.openVendor}
                            onToggleHiddenAction={page.toggleHidden}
                            onRemoveAction={page.requestRemove}
                        />
                    )}

                    {/* What vendors can do */}
                    <VendorCapabilities items={capabilities} />
                </div>
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
                error={page.sheetError}
                isPatching={page.isSheetPatching}
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
                open={page.removeTarget !== null}
                title={t('manage.removeTitle', { name: removeName })}
                body={t('manage.removeBody')}
                confirmLabel={t('manage.removeConfirm')}
                cancelLabel={t('manage.removeCancel')}
                onCloseAction={page.cancelRemove}
                onConfirmAction={page.confirmRemove}
                isConfirming={page.isRemoving}
            />
        </ManagePageFrame>
    );
}
