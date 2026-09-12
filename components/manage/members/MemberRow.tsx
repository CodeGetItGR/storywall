import { Flag, Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import Avatar from '@/components/ui/avatar';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { avatarColorFromId, initialsFromName } from '@/lib/utils';

type MemberRowProps = {
    canModerate: boolean;
    canReport: boolean;
    joinedLabel: string;
    member: EventMemberResponseDto;
    onRemoveAction: (member: EventMemberResponseDto) => void;
    onReportAction: (member: EventMemberResponseDto) => void;
    removeLabel: string;
    reportLabel: string;
};

export function MemberRow({ canModerate, canReport, joinedLabel, member, onRemoveAction, onReportAction, removeLabel, reportLabel }: MemberRowProps) {
    const handleReport = useCallback(() => onReportAction(member), [member, onReportAction]);
    const handleRemove = useCallback(() => onRemoveAction(member), [member, onRemoveAction]);

    return (
        <li className="flex items-center gap-3 border-b border-border/70 py-3 last:border-b-0">
            <Avatar src={member.avatarUrl} initials={initialsFromName(member.displayName)} color={avatarColorFromId(member.id)} alt={member.displayName} size="sm" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{member.displayName}</p>
                <p className="mt-0.5 text-xs text-ink-faint">{joinedLabel}</p>
            </div>
            {canModerate && (
                <div className="flex shrink-0 items-center gap-1">
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
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                    >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">{removeLabel}</span>
                    </button>
                </div>
            )}
        </li>
    );
}
