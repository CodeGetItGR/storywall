'use client';

import { BriefcaseBusiness } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { BecomePartnerSheet } from '@/components/vendors/BecomePartnerSheet';
import { PartnerBenefitsSection } from '@/components/vendors/me/PartnerBenefitsSection';
import { PrintPricesLinkSection } from '@/components/vendors/me/PrintPricesLinkSection';
import { PrintsIncludedRow } from '@/components/vendors/me/PrintsIncludedRow';
import { PrintsIncludedSheet } from '@/components/vendors/me/PrintsIncludedSheet';
import { PrintsSection } from '@/components/vendors/me/PrintsSection';
import { ProAlbumSection } from '@/components/vendors/me/ProAlbumSection';
import { ReachSection } from '@/components/vendors/me/ReachSection';
import { SneakPeekSection } from '@/components/vendors/me/SneakPeekSection';
import { SneakPeekSheet } from '@/components/vendors/me/SneakPeekSheet';
import { VendorListingSection } from '@/components/vendors/me/VendorListingSection';
import { VendorMeGroup } from '@/components/vendors/me/VendorMeGroup';
import { VendorMeHero } from '@/components/vendors/me/VendorMeHero';
import { VendorMeNotVendor } from '@/components/vendors/me/VendorMeNotVendor';
import { VendorToolLinks } from '@/components/vendors/me/VendorToolLinks';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { usePartnerBenefits } from '@/hooks/usePartnerBenefits';
import { useReachSection } from '@/hooks/useReachSection';
import { useSneakPeekSection } from '@/hooks/useSneakPeekSection';
import { useVendorHeroPhotos } from '@/hooks/useVendorHeroPhotos';
import { useVendorMePage } from '@/hooks/useVendorMePage';
import { useVendorPageSectionTarget } from '@/hooks/useVendorPageSectionTarget';
import { useVendorPrintsSection } from '@/hooks/useVendorPrintsSection';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export function VendorMeScreen() {
    const t = useTranslations('Vendors');
    const tSneakPeek = useTranslations('Vendors.sneakPeek');
    const locale = useLocale();
    const { eventId } = useEventRouteContext();
    const page = useVendorMePage(eventId);
    const { me, profile } = page;
    const prints = useVendorPrintsSection(eventId, me);
    // Print prices are set on the business page; this page only links to them.
    const showPrintPrices = me?.vendorType === 'PHOTOGRAPHER';
    const sneakPeek = useSneakPeekSection(eventId, me, page.hasProAlbum);
    const reach = useReachSection(eventId, me);
    const partner = usePartnerBenefits(me);
    const heroPhotos = useVendorHeroPhotos(eventId, page.hasProAlbum);
    useVendorPageSectionTarget({
        ready: !page.isLoading && me !== null,
        sneakPeekLoading: sneakPeek.isLoadingItems,
        sneakPeekReady: sneakPeek.state === 'ready',
        openSneakPeek: sneakPeek.openNew,
    });
    const hasEventWork = page.tools.length > 0 || prints.open || page.hasProAlbum || sneakPeek.visible || reach.visible;

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={t('me.title')}
            icon={BriefcaseBusiness}
            backLabel={t('me.back')}
            backHref={routes.events.feed(eventId)}
        >
            {page.isLoading ? (
                <VendorRowsSkeleton />
            ) : !me ? (
                <VendorMeNotVendor backHref={routes.events.feed(eventId)} />
            ) : (
                <div className="flex flex-col gap-10">
                    {/* Hero: photos, identity and access */}
                    <VendorMeHero
                        profile={profile}
                        vendorType={me.vendorType}
                        photos={heroPhotos}
                        accessLine={
                            me.accessEndsAt ? t('me.accessUntil', { date: formatDate(locale, me.accessEndsAt, { dateStyle: 'long' }) }) : null
                        }
                        toolsOffLine={me.toolsOff ? t(`me.toolsOff.${me.toolsOff}`) : null}
                        onEditAction={page.openProfile}
                    />

                    {/* Event: the work for this event */}
                    {hasEventWork && (
                        <VendorMeGroup id="vendor-event-title" title={t('me.groupEvent')}>
                            {/* Tools */}
                            {page.tools.length > 0 && <VendorToolLinks tools={page.tools} />}

                            {/* Pro album */}
                            {page.hasProAlbum && (
                                <ProAlbumSection
                                    eventId={eventId}
                                    usedBytes={me.proUsedBytes ?? 0}
                                    allowanceBytes={me.proStorageBytes ?? 0}
                                    canUpload={page.canUploadPro}
                                />
                            )}

                            {/* Sneak peek */}
                            {sneakPeek.visible && sneakPeek.state !== 'hidden' && (
                                <SneakPeekSection
                                    state={sneakPeek.state}
                                    thumbnails={sneakPeek.thumbnails}
                                    fanItems={sneakPeek.candidates}
                                    feedHref={sneakPeek.feedHref}
                                    onChooseAction={sneakPeek.openNew}
                                    onEditAction={sneakPeek.openEdit}
                                    onDeleteAction={sneakPeek.requestDelete}
                                />
                            )}

                            {/* Print order */}
                            {prints.open && (
                                <PrintsSection
                                    items={prints.items}
                                    removedCount={prints.removedCount}
                                    totals={prints.totals}
                                    partCount={prints.partCount}
                                    isLoadingParts={prints.isLoadingParts}
                                    downloadingPart={prints.downloadingPart}
                                    isLoading={prints.isLoading}
                                    isLoadingIncluded={prints.isLoadingIncluded}
                                    listFailed={prints.listFailed}
                                    includedFailed={prints.includedFailed}
                                    error={prints.sectionError}
                                    onDownloadPartAction={prints.downloadHostPart}
                                />
                            )}

                            {/* Reach */}
                            {reach.visible && (
                                <ReachSection
                                    tiles={reach.tiles}
                                    sampleTiles={reach.sampleTiles}
                                    partner={reach.partner}
                                    canApply={partner.canApply}
                                    isLoading={reach.isLoading}
                                    loadFailed={reach.loadFailed}
                                    onBecomePartnerAction={partner.sheet.openSheet}
                                />
                            )}
                        </VendorMeGroup>
                    )}

                    {/* Settings: set once, change rarely */}
                    {(showPrintPrices || page.canChooseListing) && (
                        <VendorMeGroup id="vendor-settings-title" title={t('me.groupSettings')}>
                            {/* Print prices */}
                            {showPrintPrices && (
                                <PrintPricesLinkSection
                                    includedRow={
                                        prints.open &&
                                        !prints.includedFailed && (
                                            <PrintsIncludedRow
                                                included={prints.included}
                                                isLoading={prints.isLoadingIncluded}
                                                onEditAction={prints.openIncluded}
                                            />
                                        )
                                    }
                                />
                            )}

                            {/* Listing */}
                            {page.canChooseListing && (
                                <VendorListingSection
                                    listed={page.listed}
                                    hiddenByHost={page.hiddenByHost}
                                    disabled={page.isTogglingListed}
                                    error={page.error}
                                    onToggleAction={page.toggleListed}
                                />
                            )}
                        </VendorMeGroup>
                    )}

                    {/* Partner */}
                    {partner.visible && (
                        <PartnerBenefitsSection
                            partner={partner.partner}
                            canApply={partner.canApply}
                            benefits={partner.benefits}
                            coming={partner.coming}
                            onApplyAction={partner.sheet.openSheet}
                        />
                    )}
                </div>
            )}

            {/* Details sheet */}
            {page.profileOpen && me && <VendorProfileSheet open profile={profile} defaultType={me.vendorType} onCloseAction={page.closeProfile} />}

            {/* Prints included sheet */}
            {prints.open && (
                <PrintsIncludedSheet
                    key={prints.includedOpen ? 'open' : 'closed'}
                    open={prints.includedOpen}
                    initial={prints.included}
                    isSaving={prints.isSavingIncluded}
                    error={prints.sheetError}
                    onSaveAction={prints.saveIncluded}
                    onCloseAction={prints.closeIncluded}
                />
            )}

            {/* Sneak peek sheet */}
            {sneakPeek.sheet && (
                <SneakPeekSheet
                    key={sneakPeek.sheet}
                    open
                    mode={sneakPeek.sheet}
                    items={sneakPeek.candidates}
                    initialPicked={sneakPeek.initialPicked}
                    initialCaption={sneakPeek.initialCaption}
                    hasMore={sneakPeek.hasMore}
                    isSaving={sneakPeek.isSaving}
                    error={sneakPeek.error}
                    onLoadMoreAction={sneakPeek.loadMore}
                    onSubmitAction={sneakPeek.submit}
                    onCloseAction={sneakPeek.closeSheet}
                />
            )}

            {/* Sneak peek delete confirmation */}
            <ConfirmActionModal
                open={sneakPeek.confirmDelete}
                onCloseAction={sneakPeek.cancelDelete}
                onConfirmAction={sneakPeek.confirmRemove}
                title={tSneakPeek('deleteTitle')}
                body={
                    <>
                        {tSneakPeek('deleteBody')}
                        {sneakPeek.deleteError && <span className="mt-1 block text-destructive">{sneakPeek.deleteError}</span>}
                    </>
                }
                confirmLabel={tSneakPeek('deleteConfirm')}
                cancelLabel={tSneakPeek('deleteCancel')}
                isConfirming={sneakPeek.isDeleting}
            />

            {/* Partner sheet, from the partner block and every locked preview */}
            <BecomePartnerSheet
                open={partner.sheet.sheetOpen}
                defaults={partner.sheet.defaults}
                search={partner.sheet.search}
                onCloseAction={partner.sheet.closeSheet}
            />
        </ModulePageShell>
    );
}
