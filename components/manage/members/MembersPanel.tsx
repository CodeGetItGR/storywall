'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { MemberRoleSheet } from '@/components/manage/members/MemberRoleSheet';
import { ReportTargetModal } from '@/components/reports/ReportTargetModal';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type MembersPanelProps, useMembersPage } from '@/hooks/useMembersPage';

import { CurrentHostsSection } from './CurrentHostsSection';
import { MembersList } from './MembersList';
import { MembersUsageTiles } from './MembersUsageTiles';
import { PromoteCoHostModal } from './PromoteCoHostModal';

export function MembersPanel(props: MembersPanelProps) {
    const tMembers = useTranslations('ManagePage.members');
    const page = useMembersPage(props);
    const { moderation, roleSheet, promoteFlow } = page;
    const handleConfirmRemove = useCallback(() => moderation.confirmRemove(tMembers('removeFailed')), [moderation, tMembers]);
    const notices = [page.membersFullNotice, page.coHostsFullNotice].filter((notice): notice is string => Boolean(notice));

    return (
        <div className="flex flex-col gap-6">
            {/* Usage */}
            <MembersUsageTiles members={page.memberUsage} coHosts={page.coHostUsage} notices={notices} />

            {/* Current hosts */}
            <CurrentHostsSection page={page} />

            {/* Members */}
            <MembersList page={page} />

            {/* Remove member confirmation */}
            <ConfirmActionModal
                open={moderation.memberToRemove !== null}
                onCloseAction={moderation.closeRemove}
                onConfirmAction={handleConfirmRemove}
                title={tMembers('removeConfirmTitle')}
                body={
                    <>
                        {tMembers('removeConfirmBody', { name: moderation.memberToRemove?.displayName ?? '' })}
                        {moderation.removeError && <span className="mt-1 block text-destructive">{moderation.removeError}</span>}
                    </>
                }
                confirmLabel={tMembers('remove')}
                cancelLabel={tMembers('cancel')}
                isConfirming={moderation.isRemoving}
            />

            {/* Promote to co-host confirmation */}
            <PromoteCoHostModal flow={promoteFlow} />

            {/* Role sheet */}
            {roleSheet.member && <MemberRoleSheet eventId={props.eventId} member={roleSheet.member} onCloseAction={roleSheet.close} />}

            {/* Report member */}
            {moderation.memberToReport && (
                <ReportTargetModal
                    open
                    eventId={props.eventId}
                    targetType="MEMBER"
                    targetId={moderation.memberToReport.id}
                    targetName={moderation.memberToReport.displayName}
                    onCloseAction={moderation.closeReport}
                />
            )}
        </div>
    );
}
