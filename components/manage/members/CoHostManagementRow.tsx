import { ArrowRightLeft, Crown, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import Avatar from '@/components/ui/avatar';
import { useMemberAvatarUrl } from '@/hooks/useMemberAvatarUrl';
import type { EventHostResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

type CoHostManagementRowProps = {
    canManage: boolean;
    host: EventHostResponseDto;
    member: EventMemberResponseDto | undefined;
    onRemoveAction: (host: EventHostResponseDto) => void;
    onTransferAction: (host: EventHostResponseDto) => void;
};

export function CoHostManagementRow({ canManage, host, member, onRemoveAction, onTransferAction }: CoHostManagementRowProps) {
    const t = useTranslations('ManagePage.invitations.coHosts');
    const memberAvatarUrl = useMemberAvatarUrl();
    const displayName = member?.displayName ?? host.memberId;
    const isPrimary = host.displayOrder === 0;
    const handleTransfer = useCallback(() => onTransferAction(host), [host, onTransferAction]);
    const handleRemove = useCallback(() => onRemoveAction(host), [host, onRemoveAction]);

    return (
        <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Avatar
                src={memberAvatarUrl(host.memberId, member?.avatarUrl)}
                initials={initialsFromName(displayName)}
                color={avatarColorFromId(host.memberId)}
                alt={displayName}
                size="sm"
            />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{isPrimary ? t('primary') : t('coHost')}</p>
            </div>
            {isPrimary ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-800 uppercase">
                    <Crown className="h-3 w-3" aria-hidden="true" />
                    {t('primary')}
                </span>
            ) : (
                canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={handleTransfer}
                            className="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                            <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{t('transfer')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{t('remove')}</span>
                        </button>
                    </div>
                )
            )}
        </div>
    );
}
