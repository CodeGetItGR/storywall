'use client';

import { BriefcaseBusiness, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { PartnerPromptCard } from '@/components/vendors/me/PartnerPromptCard';
import { ProAlbumSection } from '@/components/vendors/me/ProAlbumSection';
import { VendorListingSection } from '@/components/vendors/me/VendorListingSection';
import { VendorToolLinks } from '@/components/vendors/me/VendorToolLinks';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useVendorMePage } from '@/hooks/useVendorMePage';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export function VendorMeScreen() {
    const t = useTranslations('Vendors');
    const locale = useLocale();
    const { eventId } = useEventRouteContext();
    const page = useVendorMePage(eventId);
    const { me, profile } = page;

    return (
        <ModulePageShell maxWidth="2xl" title={t('me.title')} icon={BriefcaseBusiness} backLabel={t('me.back')} backHref={routes.events.feed(eventId)}>
            {page.isLoading ? (
                <VendorRowsSkeleton />
            ) : !me ? (
                <p className="text-sm text-ink-muted">{t('me.notVendor')}</p>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* Access: one line, either the reason the tools are off or the date they stop */}
                    {me.toolsOff ? (
                        <p className="text-sm text-ink-muted">{t(`me.toolsOff.${me.toolsOff}`)}</p>
                    ) : (
                        me.accessEndsAt && <p className="text-sm text-ink-muted">{t('me.accessUntil', { date: formatDate(locale, me.accessEndsAt, { dateStyle: 'long' }) })}</p>
                    )}

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

                    {/* Details */}
                    <section aria-labelledby="vendor-details-title">
                        <div className="flex items-center justify-between gap-3">
                            <h2 id="vendor-details-title" className="text-sm font-semibold text-ink">
                                {t('me.profileTitle')}
                            </h2>
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

                    {/* Partner */}
                    {page.showPartnerPrompt && <PartnerPromptCard />}
                </div>
            )}

            {/* Details sheet */}
            {page.profileOpen && me && <VendorProfileSheet open profile={profile} defaultType={me.vendorType} onCloseAction={page.closeProfile} />}
        </ModulePageShell>
    );
}
