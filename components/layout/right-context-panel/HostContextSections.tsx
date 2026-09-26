import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { MediaSummarySection } from '@/components/layout/right-context-panel/MediaSummarySection';
import { QrLinksSection } from '@/components/layout/right-context-panel/QrLinksSection';
import { RsvpSummarySection } from '@/components/layout/right-context-panel/RsvpSummarySection';
import { WishbookSummarySection } from '@/components/layout/right-context-panel/WishbookSummarySection';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { type UseRightContextPanelResult } from '@/hooks/useRightContextPanel';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';

/**
 * The host action links, plan usage, and RSVP/media/wishbook/QR-links
 * summaries shared between the feed's RightContextPanel (inside an aside)
 * and the manage page's Overview tab (inline in normal page flow).
 */
export function HostContextSections({ panel, showMembersUsage = true }: { panel: UseRightContextPanelResult; showMembersUsage?: boolean }) {
    const t = useTranslations('RightContextPanel');
    const {
        activeEvent,
        eventUsage,
        currentPlan,
        nextUpgradeOption,
        includedModuleKeys,
        actionItems,
        showRsvpSummary,
        rsvpSummary,
        showMediaSummary,
        mediaSummary,
        showGalleryQr,
        galleryQrLink,
        showInvitationsQr,
        invitationsQrCount,
        showWishbookSummary,
        wishbookEntries,
        wishbookTotal,
    } = panel;

    if (!activeEvent) return null;

    return (
        <div className="xxl:gap-8 flex flex-col gap-3">
            {/* Actions */}
            {actionItems.length > 0 && (
                <div>
                    <p className="mb-2 text-sm font-semibold text-ink">{t('hostActions')}</p>
                    <div>
                        {actionItems.map(({ key, href, icon: Icon, label }) => (
                            <Link
                                key={key}
                                href={href}
                                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                            >
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="min-w-0 truncate">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* RSVP summary */}
            {showRsvpSummary && rsvpSummary && <RsvpSummarySection eventId={activeEvent.id} summary={rsvpSummary} />}

            {/* Media summary */}
            {showMediaSummary && mediaSummary && <MediaSummarySection eventId={activeEvent.id} summary={mediaSummary} />}

            {/* QR links (gallery upload + share/join) */}
            <QrLinksSection
                eventId={activeEvent.id}
                showGallery={showGalleryQr}
                galleryQrLink={galleryQrLink}
                showInvitations={showInvitationsQr}
                invitationsQrCount={invitationsQrCount}
            />

            {/* Wishbook summary */}
            {showWishbookSummary && <WishbookSummarySection eventId={activeEvent.id} entries={wishbookEntries} total={wishbookTotal} />}

            {/* Plan usage */}
            {eventUsage && (
                <UsagePanel
                    title={t('usageTitle')}
                    planName={currentPlan?.name ?? eventUsage.planTier}
                    nextPlanName={nextUpgradeOption?.planTierName}
                    upgradeHref={routes.events.manage(activeEvent.id, { tab: 'billing' })}
                    includedModuleKeys={includedModuleKeys}
                    items={[
                        {
                            key: 'storage',
                            used: eventUsage.storageBytes,
                            limit: eventUsage.storageLimitBytes,
                            percent: eventUsage.storagePercent,
                            valueLabel:
                                eventUsage.storageLimitBytes === null
                                    ? formatBytes(eventUsage.storageBytes)
                                    : `${formatBytes(eventUsage.storageBytes)} / ${formatBytes(eventUsage.storageLimitBytes)}`,
                        },
                        ...(showMembersUsage
                            ? [
                                  {
                                      key: 'members' as const,
                                      used: eventUsage.memberCount,
                                      limit: eventUsage.memberLimit,
                                      percent: eventUsage.memberPercent,
                                      valueLabel:
                                          eventUsage.memberLimit === null
                                              ? `${eventUsage.memberCount}`
                                              : `${eventUsage.memberCount} / ${eventUsage.memberLimit}`,
                                  },
                              ]
                            : []),
                    ]}
                />
            )}
        </div>
    );
}
