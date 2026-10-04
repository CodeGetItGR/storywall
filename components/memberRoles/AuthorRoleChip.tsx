'use client';

import { useTranslations } from 'next-intl';

import { RoleChip } from '@/components/memberRoles/RoleChip';
import { useAuthorRole } from '@/hooks/useAuthorRole';
import type { AuthorDto } from '@/lib/api/types';
import { requestMyRoleSheet } from '@/lib/myRoleSheetRequests';

// The viewer's own chip opens the role sheet; everyone else's is plain text.
export function AuthorRoleChip({
    author,
    tone = 'default',
    interactive = true,
}: {
    author: AuthorDto | null | undefined;
    tone?: 'default' | 'onDark' | 'onMuted';
    interactive?: boolean;
}) {
    const t = useTranslations('MemberRoles');
    const { label, isMine } = useAuthorRole(author);

    if (!label) return null;

    return <RoleChip label={label} tone={tone} onClick={interactive && isMine ? requestMyRoleSheet : undefined} ariaLabel={isMine ? t('editMyRole') : undefined} />;
}
