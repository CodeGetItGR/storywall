'use client';

import { Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { ReportTargetModal } from '@/components/reports';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useMemberModeration } from '@/hooks/useMemberModeration';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

import { MemberRow } from './MemberRow';

type MembersPanelProps = {
    canModerate: boolean;
    eventId: string;
    members: EventMemberResponseDto[];
};

export function MembersPanel({ canModerate, eventId, members }: MembersPanelProps) {
    const t = useTranslations('ManagePage.members');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const moderation = useMemberModeration(eventId, members, canModerate);
    const handleConfirmRemove = useCallback(() => moderation.confirmRemove(t('removeFailed')), [moderation, t]);
    const canReport = canModerate && Boolean(appConfig?.reportTargetTypes?.includes('MEMBER'));

    return (
        <>
            {/* Members list */}
            {moderation.attendees.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-faint">
                        <Users className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink">{t('emptyTitle')}</p>
                    <p className="mt-1 text-sm text-ink-muted">{t('emptyBody')}</p>
                </div>
            ) : (
                <ul>
                    {moderation.attendees.map((member) => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            canModerate={canModerate}
                            canReport={canReport}
                            joinedLabel={t('joined', { date: formatDate(locale, member.joinedAt, { dateStyle: 'medium' }) })}
                            onReportAction={moderation.requestReport}
                            onRemoveAction={moderation.requestRemove}
                            reportLabel={t('report')}
                            removeLabel={t('remove')}
                        />
                    ))}
                </ul>
            )}

            {/* Remove member confirmation */}
            <ConfirmActionModal
                open={moderation.memberToRemove !== null}
                onCloseAction={moderation.closeRemove}
                onConfirmAction={handleConfirmRemove}
                title={t('removeConfirmTitle')}
                body={
                    <>
                        {t('removeConfirmBody', { name: moderation.memberToRemove?.displayName ?? '' })}
                        {moderation.removeError && <span className="mt-1 block text-destructive">{moderation.removeError}</span>}
                    </>
                }
                confirmLabel={t('remove')}
                cancelLabel={t('cancel')}
                isConfirming={moderation.isRemoving}
            />

            {/* Report member */}
            {moderation.memberToReport && (
                <ReportTargetModal
                    open
                    eventId={eventId}
                    targetType="MEMBER"
                    targetId={moderation.memberToReport.id}
                    targetName={moderation.memberToReport.displayName}
                    onCloseAction={moderation.closeReport}
                />
            )}
        </>
    );
}
