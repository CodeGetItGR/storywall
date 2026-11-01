'use client';

import { BriefcaseBusiness } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BusinessContactSection } from '@/components/business/BusinessContactSection';
import { BusinessContactSheet } from '@/components/business/BusinessContactSheet';
import { BusinessContentSection } from '@/components/business/BusinessContentSection';
import { BusinessEventsSection } from '@/components/business/BusinessEventsSection';
import { BusinessHero } from '@/components/business/BusinessHero';
import { BusinessInsightsSection } from '@/components/business/BusinessInsightsSection';
import { BusinessNotVendor } from '@/components/business/BusinessNotVendor';
import { BusinessPreviewsSection } from '@/components/business/BusinessPreviewsSection';
import { BusinessSkeleton } from '@/components/business/BusinessSkeleton';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { PageErrorState } from '@/components/ui/PageErrorState';
import { BecomePartnerSheet } from '@/components/vendors/BecomePartnerSheet';
import { ServiceSheet } from '@/components/vendors/me/ServiceSheet';
import { ServicesSection } from '@/components/vendors/me/ServicesSection';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessPage } from '@/hooks/useBusinessPage';
import { routes } from '@/lib/routes';

// "My business": one page across all of a vendor's events.
export function BusinessScreen() {
    const t = useTranslations('BusinessPage');
    const tServices = useTranslations('Vendors.services');
    const { user } = useAuth();
    const page = useBusinessPage();
    const { overview, sections, profile, services, contact, becomePartner } = page;
    const name = profile?.businessName ?? t('unnamed');

    return (
        <ModulePageShell maxWidth="5xl" title={t('title')} icon={BriefcaseBusiness} backLabel={t('back')} backHref={routes.profile}>
            {page.isLoading ? (
                <BusinessSkeleton />
            ) : page.notVendor ? (
                <BusinessNotVendor />
            ) : page.loadFailed || !overview || !sections ? (
                <PageErrorState title={t('unavailable.title')} description={t('unavailable.description')} onRetryAction={page.retry} />
            ) : (
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    {/* Top card */}
                    <BusinessHero
                        profile={profile}
                        vendorType={overview.vendorType}
                        partner={overview.partner}
                        balances={page.balances}
                        tierProgress={page.tierProgress}
                        onEditAction={page.openProfile}
                    />

                    {/* Main: numbers and events */}
                    <div className="flex min-w-0 flex-col gap-4">
                        {/* Insights */}
                        <BusinessInsightsSection overview={overview} onBecomePartnerAction={becomePartner.openSheet} />

                        {/* Events */}
                        <BusinessEventsSection
                            events={page.events.events}
                            isLoading={page.events.isLoading}
                            loadFailed={page.events.loadFailed}
                            hasMore={page.events.hasMore}
                            isLoadingMore={page.events.isLoadingMore}
                            onLoadMoreAction={page.events.loadMore}
                            onRetryAction={page.events.retry}
                        />

                        {/* Content */}
                        {sections.content && overview.content && <BusinessContentSection content={overview.content} />}
                    </div>

                    {/* Side: what they offer, how guests see them, contact */}
                    <div className="flex min-w-0 flex-col gap-4">
                        {/* Print prices */}
                        {sections.printPrices && (
                            <div id="print-prices">
                                <ServicesSection
                                    approved={services.approved}
                                    sizes={services.sizes}
                                    canAdd={services.canAdd}
                                    needsProfile={services.needsProfile}
                                    profileLoading={services.profileLoading}
                                    isLoading={services.isLoading}
                                    loadFailed={services.loadFailed}
                                    error={services.sectionError}
                                    includedRow={null}
                                    canApply={!overview.partner}
                                    onAddAction={services.openNew}
                                    onEditAction={services.openEdit}
                                    onBecomePartnerAction={becomePartner.openSheet}
                                />
                            </div>
                        )}

                        {/* Previews */}
                        {sections.previews && (
                            <BusinessPreviewsSection
                                cardPreview={sections.feedCard ? page.cardPreview : null}
                                showSneakPeek={sections.sneakPeekSample}
                                name={name}
                                logoUrl={profile?.logoUrl ?? null}
                            />
                        )}

                        {/* Contact */}
                        <BusinessContactSection onOpenAction={contact.openSheet} />
                    </div>
                </div>
            )}

            {/* Details sheet */}
            {page.profileOpen && overview && (
                <VendorProfileSheet open profile={profile} defaultType={overview.vendorType ?? 'OTHER'} onCloseAction={page.closeProfile} />
            )}

            {/* Print size sheet */}
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

            {/* Print size delete confirmation */}
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

            {/* Contact sheet */}
            {contact.open && (
                <BusinessContactSheet
                    topic={contact.topic}
                    message={contact.message}
                    topicError={contact.topicError}
                    messageError={contact.messageError}
                    sendError={contact.sendError}
                    sent={contact.sent}
                    isSending={contact.isSending}
                    replyEmail={user?.email ?? ''}
                    onTopicChangeAction={contact.setTopic}
                    onMessageChangeAction={contact.setMessage}
                    onSubmitAction={contact.submit}
                    onCloseAction={contact.closeSheet}
                />
            )}

            {/* Partner application */}
            <BecomePartnerSheet
                open={becomePartner.sheetOpen}
                defaults={becomePartner.defaults}
                search={becomePartner.search}
                onCloseAction={becomePartner.closeSheet}
            />
        </ModulePageShell>
    );
}
