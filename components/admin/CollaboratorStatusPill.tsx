import { useTranslations } from 'next-intl';

import type { CollaboratorResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const COLLABORATOR_STATUS_DOT: Record<CollaboratorResponseDto['status'], string> = {
    ACTIVE: 'bg-status-good',
    SUSPENDED: 'bg-status-neutral',
};

const COLLABORATOR_STATUS_PILL: Record<CollaboratorResponseDto['status'], string> = {
    ACTIVE: 'bg-status-good-wash text-status-good',
    SUSPENDED: 'bg-status-neutral-wash text-status-neutral',
};

export function CollaboratorStatusPill({ status }: { status: CollaboratorResponseDto['status'] }) {
    const t = useTranslations('AdminPage.collaborations.status');

    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', COLLABORATOR_STATUS_PILL[status])}>
            <span className={cn('h-1.5 w-1.5 rounded-full', COLLABORATOR_STATUS_DOT[status])} />
            {t(status)}
        </span>
    );
}
