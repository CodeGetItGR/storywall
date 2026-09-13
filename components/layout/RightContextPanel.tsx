'use client';

import { Images, LayoutDashboard, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { MediaSummarySection } from '@/components/layout/right-context-panel/MediaSummarySection';
import { RsvpSummarySection } from '@/components/layout/right-context-panel/RsvpSummarySection';
import { WishbookSummarySection } from '@/components/layout/right-context-panel/WishbookSummarySection';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { useRightContextPanel } from '@/hooks/useRightContextPanel';
import { formatBytes } from '@/lib/format';
import { routes } from '@/lib/routes';

export function RightContextPanel() {
    const t = useTranslations('RightContextPanel');
    const {
        visible,
        activeEvent,
        isDraft,
        eventUsage,
        currentPlan,
        nextPlan,
        includedModuleKeys,
        showRsvpSummary,
        rsvpSummary,
        showMediaSummary,
        mediaSummary,
        showWishbookSummary,
        wishbookEntries,
        wishbookTotal,
    } = useRightContextPanel();

    if (!visible || !activeEvent) return null;

    // Dashboard sections are reached from the dashboard itself, so this panel
    // links to it once instead of repeating its sections as separate destinations.
    const hostLinks = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
        { key: 'gallery', href: routes.events.tools.gallery(activeEvent.id), icon: Images },
        { key: 'rsvps', href: routes.events.tools.rsvp(activeEvent.id), icon: Ticket },
    ] as const;

    return (
        <aside
            aria-label={t('hostConsole')}
            className="sticky top-0 hidden h-screen w-75 shrink-0 flex-col overflow-y-auto border-l border-border bg-background no-scrollbar xl:flex"
        >
            <div className="flex flex-col gap-5 p-5">
                {/* Actions */}
                <div>
                    <p className="mb-2 text-sm font-semibold text-ink">{t('hostActions')}</p>
                    <div className="space-y-1">
                        {hostLinks
                            .filter(({ key }) => !isDraft || key === 'manage')
                            .map(({ key, href, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                                >
                                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    <span className="min-w-0 truncate">{t(`links.${key}`)}</span>
                                </Link>
                            ))}
                    </div>
                </div>

                {/* Plan Usage */}
                {eventUsage && (
                    <UsagePanel
                        title={t('usageTitle')}
                        planName={currentPlan?.name ?? eventUsage.planTier}
                        nextPlanName={nextPlan?.name}
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
                            {
                                key: 'members',
                                used: eventUsage.memberCount,
                                limit: eventUsage.memberLimit,
                                percent: eventUsage.memberPercent,
                                valueLabel:
                                    eventUsage.memberLimit === null
                                        ? `${eventUsage.memberCount}`
                                        : `${eventUsage.memberCount} / ${eventUsage.memberLimit}`,
                            },
                        ]}
                    />
                )}

                {/* RSVP summary */}
                {showRsvpSummary && rsvpSummary && <RsvpSummarySection eventId={activeEvent.id} summary={rsvpSummary} />}

                {/* Media summary */}
                {showMediaSummary && mediaSummary && <MediaSummarySection eventId={activeEvent.id} summary={mediaSummary} />}

                {/* Wishbook summary */}
                {showWishbookSummary && <WishbookSummarySection eventId={activeEvent.id} entries={wishbookEntries} total={wishbookTotal} />}
            </div>
        </aside>
    );
}
