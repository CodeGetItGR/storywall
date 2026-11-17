'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GuestChoicesList } from '@/components/manage/invitations/GuestChoicesList';
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
        invitation,
        rows,
        eventTitle,
    } = useInvitationsQrScreen();

    const content = isLoading ? (
        <QrLinksListSkeleton />
    ) : (
        // Phones stack every section; from lg up, What guests see moves to a column on the right.
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="flex min-w-0 flex-col gap-6">
                {/* Capacity */}
                {eventUsage && (
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
                )}

                {/* Read only */}
                {isHost && !isWritable && (
                    <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm leading-relaxed text-ink-muted">{t('qr.readOnly')}</p>
                )}

                {/* Link and QR code */}
                {shareQrLinks.length > 0 && (
                    <div className="flex flex-col divide-y divide-border [&>*]:py-8 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                        {shareQrLinks.map((qrLink) => {
                            const stats = qrLinkStats.find((row) => row.qrLinkId === qrLink.id);
                            return (
                                <ShareLinkPanel
                                    key={qrLink.id}
                                    eventId={eventId}
                                    qrLink={qrLink}
                                    stats={stats}
                                    canWrite={canWrite}
                                    eventTitle={eventTitle}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Empty */}
                {shareQrLinks.length === 0 && <ToolEmptyState title={t('qr.emptyTitle')} body={t('qr.emptyBody')} icon={QrCode} className="py-8" />}
            </div>

            {/* What guests see */}
            <GuestChoicesList rows={rows} invitation={isHost ? invitation : null} />
        </div>
    );

    // Hosts see their links inside the dashboard; a planner (QR_READ) keeps the standalone page.
    if (isHost) {
        return (
            <ManagePageFrame active="invitationsQr" wide>
                {content}
            </ManagePageFrame>
        );
    }

    return (
        <ModulePageShell maxWidth="5xl" title={tPage('title')} icon={QrCode} backLabel={tPage('back')} backHref={routes.events.feed(eventId)}>
            {content}
        </ModulePageShell>
    );
}
