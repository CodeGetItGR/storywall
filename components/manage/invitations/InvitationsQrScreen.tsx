'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ShareLanguageNote } from '@/components/manage/invitations/ShareLanguageNote';
import { ShareLinkPanel } from '@/components/manage/invitations/ShareLinkPanel';
import { QrLinksListSkeleton } from '@/components/manage/ManageSkeletons';
import { ManagePageFrame } from '@/components/manage/nav/ManagePageFrame';
import { UsagePanel } from '@/components/plan/UsagePanel';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { useInvitationsQrScreen } from '@/hooks/useInvitationsQrScreen';
import { routes } from '@/lib/routes';

export function InvitationsQrScreen() {
    const t = useTranslations('ManagePage');
    const tPage = useTranslations('InvitationsQrPage');
    const {
        eventId,
        isHost,
        isWritable,
        canWrite,
        isLoading,
        eventUsage,
        memberCount,
        memberLimit,
        currentPlanName,
        nextPlanName,
        upgradeHref,
        qrLinkStats,
        shareQrLinks,
    } = useInvitationsQrScreen();

    const content = isLoading ? (
        <QrLinksListSkeleton />
    ) : (
        <>
            {/* Capacity */}
            {eventUsage && (
                <div className="mb-8">
                    <UsagePanel
                        title={t('invitations.capacity.title')}
                        planName={currentPlanName}
                        nextPlanName={nextPlanName}
                        upgradeHref={upgradeHref}
                        items={[
                            {
                                key: 'members',
                                used: memberCount,
                                limit: memberLimit,
                                percent: eventUsage.memberPercent,
                                valueLabel: memberLimit === null ? `${memberCount}` : `${memberCount} / ${memberLimit}`,
                            },
                        ]}
                    />
                </div>
            )}

            {/* Read-only note */}
            {isHost && !isWritable && (
                <p className="mb-3 rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('qr.readOnly')}</p>
            )}

            {/* Share links */}
            <div className="flex flex-col divide-y divide-border [&>*]:py-8 [&>*:first-child]:pt-0">
                {shareQrLinks.map((qrLink) => {
                    const stats = qrLinkStats.find((row) => row.qrLinkId === qrLink.id);
                    return <ShareLinkPanel key={qrLink.id} eventId={eventId} qrLink={qrLink} stats={stats} canWrite={canWrite} />;
                })}
            </div>

            {/* Link language */}
            {shareQrLinks.length > 0 && <ShareLanguageNote />}

            {/* Empty */}
            {shareQrLinks.length === 0 && <ToolEmptyState title={t('qr.emptyTitle')} body={t('qr.emptyBody')} icon={QrCode} className="py-8" />}
        </>
    );

    // Hosts see their links inside the dashboard; a planner (QR_READ) keeps the standalone page.
    if (isHost) {
        return <ManagePageFrame active="invitationsQr">{content}</ManagePageFrame>;
    }

    return (
        <ModulePageShell maxWidth="2xl" title={tPage('title')} icon={QrCode} backLabel={tPage('back')} backHref={routes.events.feed(eventId)}>
            {content}
        </ModulePageShell>
    );
}
