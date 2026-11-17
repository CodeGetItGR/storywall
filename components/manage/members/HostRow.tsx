'use client';

import { ArrowRightLeft, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import Avatar from '@/components/ui/avatar';
import { type RowAction, RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import type { EventHostResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

import { MemberIdentity } from './MemberIdentity';

type HostRowProps = {
    host: EventHostResponseDto;
    member: EventMemberResponseDto | undefined;
    canManage: boolean;
    canTransfer: boolean;
    onTransferAction: (host: EventHostResponseDto) => void;
    onRemoveAction: (host: EventHostResponseDto) => void;
    onEditRoleAction?: (member: EventMemberResponseDto) => void;
};

export function HostRow({ host, member, canManage, canTransfer, onTransferAction, onRemoveAction, onEditRoleAction }: HostRowProps) {
    const t = useTranslations('ManagePage');
    const tRoles = useTranslations('MemberRoles');
    const memberAvatarUrl = useMemberAvatarUrl();
    const displayName = member?.displayName ?? host.memberId;
    const isPrimary = host.displayOrder === 0;

    const handleTransfer = useCallback(() => onTransferAction(host), [host, onTransferAction]);
    const handleRemove = useCallback(() => onRemoveAction(host), [host, onRemoveAction]);
    const handleEditRole = useCallback(() => {
        if (member) onEditRoleAction?.(member);
    }, [member, onEditRoleAction]);

    // Only a co-host has actions, and only the primary host can take them.
    const actions = useMemo<RowAction[]>(() => {
        if (isPrimary || !canManage) return [];
        return [
            ...(canTransfer ? [{ key: 'transfer', label: t('invitations.coHosts.transfer'), icon: ArrowRightLeft, onSelect: handleTransfer }] : []),
            { key: 'remove', label: t('invitations.coHosts.remove'), icon: Trash2, tone: 'danger' as const, onSelect: handleRemove },
        ];
    }, [canManage, canTransfer, handleRemove, handleTransfer, isPrimary, t]);

    return (
        <li className="flex min-h-[60px] items-center gap-3">
            {/* Identity */}
            <MemberIdentity onClick={onEditRoleAction && member ? handleEditRole : undefined} label={tRoles('host.edit', { name: displayName })}>
                <Avatar
                    src={memberAvatarUrl(host.memberId, member?.avatarUrl)}
                    initials={initialsFromName(displayName)}
                    color={avatarColorFromId(host.memberId)}
                    alt={displayName}
                    size="sm"
                />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{displayName}</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                        {isPrimary ? t('invitations.coHosts.primary') : t('invitations.coHosts.coHost')}
                    </p>
                </div>
            </MemberIdentity>

            {/* Actions */}
            <RowActionsMenu label={t('members.moreFor', { name: displayName })} items={actions} />
        </li>
    );
}
