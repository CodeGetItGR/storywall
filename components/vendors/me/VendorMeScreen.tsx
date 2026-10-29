'use client';

import { BriefcaseBusiness, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { BecomePartnerSheet } from '@/components/vendors/BecomePartnerSheet';
import { PartnerPromptCard } from '@/components/vendors/me/PartnerPromptCard';
import { PrintsIncludedRow } from '@/components/vendors/me/PrintsIncludedRow';
import { PrintsIncludedSheet } from '@/components/vendors/me/PrintsIncludedSheet';
import { PrintsSection } from '@/components/vendors/me/PrintsSection';
import { ProAlbumSection } from '@/components/vendors/me/ProAlbumSection';
import { ReachSection } from '@/components/vendors/me/ReachSection';
import { ServiceSheet } from '@/components/vendors/me/ServiceSheet';
import { ServicesSection } from '@/components/vendors/me/ServicesSection';
import { SneakPeekSection } from '@/components/vendors/me/SneakPeekSection';
import { SneakPeekSheet } from '@/components/vendors/me/SneakPeekSheet';
import { VendorListingSection } from '@/components/vendors/me/VendorListingSection';
import { VendorMeGroup } from '@/components/vendors/me/VendorMeGroup';
import { VendorToolLinks } from '@/components/vendors/me/VendorToolLinks';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useReachSection } from '@/hooks/useReachSection';
import { useSneakPeekSection } from '@/hooks/useSneakPeekSection';
import { useVendorMePage } from '@/hooks/useVendorMePage';
import { useVendorPrintsSection } from '@/hooks/useVendorPrintsSection';
import { useVendorServicesSection } from '@/hooks/useVendorServicesSection';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export function VendorMeScreen() {
    const t = useTranslations('Vendors');
    const tServices = useTranslations('Vendors.services');
    const tSneakPeek = useTranslations('Vendors.sneakPeek');
    const locale = useLocale();
    const { eventId } = useEventRouteContext();
    const page = useVendorMePage(eventId);
    const { me, profile } = page;
    const prints = useVendorPrintsSection(eventId, me);
    const services = useVendorServicesSection(me, page.profileStatus);
    const sneakPeek = useSneakPeekSection(eventId, me, page.hasProAlbum);
    const reach = useReachSection(eventId, me);
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
                <p className="text-sm text-ink-muted">{t('me.notVendor')}</p>
            ) : (
                <div className="flex flex-col gap-12">
                    {/* Access: one line, either the reason the tools are off or the date they stop */}
                    {me.toolsOff ? (
                        <p className="text-sm text-ink-muted">{t(`me.toolsOff.${me.toolsOff}`)}</p>
                    ) : (
                        me.accessEndsAt && (
                            <p className="text-sm text-ink-muted">
                                {t('me.accessUntil', { date: formatDate(locale, me.accessEndsAt, { dateStyle: 'long' }) })}
                            </p>
                        )
                    )}

                    {/* Event: the work for this event */}
                    {hasEventWork && (
                        <VendorMeGroup id="vendor-event-title" title={t('me.groupEvent')}>
                            {/* Tools */}
                            {page.tools.length > 0 && <VendorToolLinks tools={page.tools} />}

                            {/* Sneak peek */}
                            {sneakPeek.visible && sneakPeek.state !== 'hidden' && (
                                <SneakPeekSection
                                    state={sneakPeek.state}
                                    thumbnails={sneakPeek.thumbnails}
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

                            {/* Pro album */}
                            {page.hasProAlbum && (
                                <ProAlbumSection
                                    eventId={eventId}
                                    usedBytes={me.proUsedBytes ?? 0}
                                    allowanceBytes={me.proStorageBytes ?? 0}
                                    canUpload={page.canUploadPro}
                                />
                            )}

                            {/* Reach */}
                            {reach.visible && (
                                <ReachSection
                                    tiles={reach.tiles}
                                    partner={reach.partner}
                                    showPartnerAction={reach.showPartnerAction}
                                    isLoading={reach.isLoading}
                                    loadFailed={reach.loadFailed}
                                    onBecomePartnerAction={reach.partnerSheet.openSheet}
                                />
                            )}
                        </VendorMeGroup>
                    )}

                    {/* Settings: set once, change rarely */}
                    <VendorMeGroup id="vendor-settings-title" title={t('me.groupSettings')}>
                        {/* Details */}
                        <section aria-labelledby="vendor-details-title">
                            <div className="flex items-center justify-between gap-3">
                                <h3 id="vendor-details-title" className="text-sm font-semibold text-ink">
                                    {t('me.profileTitle')}
                                </h3>
                                <Button type="button" variant="outline" size="lg" onClick={page.openProfile}>
                                    <Pencil aria-hidden="true" />
                                    {t('me.profileEdit')}
                                </Button>
                            </div>
                            {profile && (
                                <div className="mt-3 flex items-center gap-3">
                                    <VendorLogo logoUrl={profile.logoUrl} name={profile.businessName} />
                                    <div className="min-w-0 text-sm">
                                        <p className="truncate font-semibold text-ink">{profile.businessName}</p>
                                        <p className="truncate text-ink-muted">{profile.link}</p>
                                    </div>
                                </div>
                            )}
                        </section>

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

                        {/* Print prices */}
                        {services.visible && (
                            <ServicesSection
                                approved={services.approved}
                                sizes={services.sizes}
                                canAdd={services.canAdd}
                                needsProfile={services.needsProfile}
                                profileLoading={services.profileLoading}
                                isLoading={services.isLoading}
                                loadFailed={services.loadFailed}
                                error={services.sectionError}
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
                                onAddAction={services.openNew}
                                onEditAction={services.openEdit}
                            />
                        )}
                    </VendorMeGroup>

                    {/* Partner */}
                    {page.showPartnerPrompt && <PartnerPromptCard />}
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

            {/* Service sheet */}
            {services.editing && (
                <ServiceSheet
                    key={services.editing === 'new' ? 'new' : services.editing.id}
                    item={services.editing}
                    isSaving={services.isSaving}
                    error={services.sheetError}
                    onSaveAction={services.save}
                    onDeleteAction={services.requestDelete}
                    onCloseAction={services.close}
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
                body={tSneakPeek('deleteBody')}
                confirmLabel={tSneakPeek('deleteConfirm')}
                cancelLabel={tSneakPeek('deleteCancel')}
                isConfirming={sneakPeek.isDeleting}
            />

            {/* Partner sheet, from the Reach section */}
            <BecomePartnerSheet
                open={reach.partnerSheet.sheetOpen}
                defaults={reach.partnerSheet.defaults}
                search={reach.partnerSheet.search}
                onCloseAction={reach.partnerSheet.closeSheet}
            />

            {/* Service delete confirmation */}
            <ConfirmActionModal
                open={services.confirmDelete}
                onCloseAction={services.cancelDelete}
                onConfirmAction={services.confirmRemove}
                title={tServices('deleteTitle')}
                body={tServices('deleteBody')}
                confirmLabel={tServices('deleteConfirm')}
                cancelLabel={tServices('cancel')}
                isConfirming={services.isDeleting}
            />
        </ModulePageShell>
    );
}
