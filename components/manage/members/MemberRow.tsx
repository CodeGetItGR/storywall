import { Flag, Trash2, UserCog } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import Avatar from '@/components/ui/avatar';
import { type RowAction, RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import { useMemberRoleLabel } from '@/hooks/useMemberRoleLabel';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

import { MemberIdentity } from './MemberIdentity';

type MemberRowProps = {
    canPromote: boolean;
    canRemove: boolean;
    canReport: boolean;
    editRoleLabel: string;
    eventTypeKey: string | null;
    joinedLabel: string;
    member: EventMemberResponseDto;
    moreLabel: string;
    onEditRoleAction?: (member: EventMemberResponseDto) => void;
    onPromoteAction: (member: EventMemberResponseDto) => void;
    onRemoveAction: (member: EventMemberResponseDto) => void;
    onReportAction: (member: EventMemberResponseDto) => void;
    promoteLabel: string;
    removeLabel: string;
    reportLabel: string;
};

export function MemberRow({
    canPromote,
    canRemove,
    canReport,
    editRoleLabel,
    eventTypeKey,
    joinedLabel,
    member,
    moreLabel,
    onEditRoleAction,
    onPromoteAction,
    onRemoveAction,
    onReportAction,
    promoteLabel,
    removeLabel,
    reportLabel,
}: MemberRowProps) {
    const memberAvatarUrl = useMemberAvatarUrl();
    const memberRole = useMemberRoleLabel(member, eventTypeKey);
    const details = [memberRole, joinedLabel].filter(Boolean).join(' · ');
    const handleEditRole = useCallback(() => onEditRoleAction?.(member), [member, onEditRoleAction]);
    const handlePromote = useCallback(() => onPromoteAction(member), [member, onPromoteAction]);
    const handleReport = useCallback(() => onReportAction(member), [member, onReportAction]);
    const handleRemove = useCallback(() => onRemoveAction(member), [member, onRemoveAction]);

    const actions = useMemo<RowAction[]>(
        () => [
            ...(canPromote ? [{ key: 'promote', label: promoteLabel, icon: UserCog, onSelect: handlePromote }] : []),
            ...(canReport ? [{ key: 'report', label: reportLabel, icon: Flag, onSelect: handleReport }] : []),
            ...(canRemove ? [{ key: 'remove', label: removeLabel, icon: Trash2, tone: 'danger' as const, onSelect: handleRemove }] : []),
        ],
        [canPromote, canRemove, canReport, handlePromote, handleRemove, handleReport, promoteLabel, removeLabel, reportLabel],
    );

    return (
        <li className="flex min-h-16 items-center gap-3 border-t border-border/60">
            {/* Identity */}
            <MemberIdentity onClick={onEditRoleAction ? handleEditRole : undefined} label={editRoleLabel}>
                <Avatar
                    src={memberAvatarUrl(member.id, member.avatarUrl)}
                    initials={initialsFromName(member.displayName)}
                    color={avatarColorFromId(member.id)}
                    alt={member.displayName}
                    size="sm"
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{member.displayName}</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-muted">{details}</p>
                </div>
            </MemberIdentity>

            {/* Actions */}
            <RowActionsMenu label={moreLabel} items={actions} />
        </li>
    );
}
