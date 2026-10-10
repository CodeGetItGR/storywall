import { Flag, Trash2, UserCog } from 'lucide-react';
import { type ReactNode, useCallback } from 'react';

import { RoleChip } from '@/components/memberRoles/RoleChip';
import Avatar from '@/components/ui/avatar';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import { useMemberRoleLabel } from '@/hooks/useMemberRoleLabel';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

type MemberRowProps = {
    canModerate: boolean;
    canPromote: boolean;
    canRemove: boolean;
    canReport: boolean;
    editRoleLabel: string;
    eventTypeKey: string | null;
    joinedLabel: string;
    member: EventMemberResponseDto;
    onEditRoleAction?: (member: EventMemberResponseDto) => void;
    onPromoteAction: (member: EventMemberResponseDto) => void;
    onRemoveAction: (member: EventMemberResponseDto) => void;
    onReportAction: (member: EventMemberResponseDto) => void;
    promoteLabel: string;
    removeLabel: string;
    reportLabel: string;
    roleLabel: string | null;
};

export function MemberRow({
    canModerate,
    canPromote,
    canRemove,
    canReport,
    editRoleLabel,
    eventTypeKey,
    joinedLabel,
    member,
    onEditRoleAction,
    onPromoteAction,
    onRemoveAction,
    onReportAction,
    promoteLabel,
    removeLabel,
    reportLabel,
    roleLabel,
}: MemberRowProps) {
    const memberAvatarUrl = useMemberAvatarUrl();
    const memberRole = useMemberRoleLabel(member, eventTypeKey);
    const handleEditRole = useCallback(() => onEditRoleAction?.(member), [member, onEditRoleAction]);
    const handlePromote = useCallback(() => onPromoteAction(member), [member, onPromoteAction]);
    const handleReport = useCallback(() => onReportAction(member), [member, onReportAction]);
    const handleRemove = useCallback(() => onRemoveAction(member), [member, onRemoveAction]);

    return (
        <li className="flex items-center gap-3 border-b border-border/70 py-3 last:border-b-0">
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
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                        <span className="truncate">{member.displayName}</span>
                        {roleLabel && (
                            <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-faint uppercase">
                                {roleLabel}
                            </span>
                        )}
                        {memberRole && <RoleChip label={memberRole} />}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">{joinedLabel}</p>
                </div>
            </MemberIdentity>

            {/* Actions */}
            {(canModerate || canPromote) && (
                <div className="flex shrink-0 items-center gap-1">
                    {canPromote && (
                        <button
                            type="button"
                            onClick={handlePromote}
                            aria-label={promoteLabel}
                            className="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                            <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{promoteLabel}</span>
                        </button>
                    )}
                    {canReport && (
                        <button
                            type="button"
                            onClick={handleReport}
                            className="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{reportLabel}</span>
                        </button>
                    )}
                    {canRemove && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{removeLabel}</span>
                        </button>
                    )}
                </div>
            )}
        </li>
    );
}

// The avatar + name block: a button when the host can edit this member's role.
function MemberIdentity({ onClick, label, children }: { onClick?: () => void; label: string; children: ReactNode }) {
    if (!onClick) return <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-colors hover:bg-surface-muted/60"
        >
            {children}
        </button>
    );
}
