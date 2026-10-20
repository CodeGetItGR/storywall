'use client';

import { useTranslations } from 'next-intl';

import { RoleChip } from '@/components/memberRoles/RoleChip';
import { useAuthorRole } from '@/hooks/useAuthorRole';
import type { AuthorDto } from '@/lib/api/types';
import { requestMyRoleSheet } from '@/lib/myRoleSheetRequests';

// A vendor's chip names their type; everyone else's is their member role.
// The viewer's own member-role chip opens the role sheet; every other chip is plain text.
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
    const tVendors = useTranslations('Vendors.types');
    const { label, isMine } = useAuthorRole(author);

    if (author?.vendorType) return <RoleChip label={tVendors(author.vendorType)} tone={tone} />;
    if (!label) return null;

    return <RoleChip label={label} tone={tone} onClick={interactive && isMine ? requestMyRoleSheet : undefined} ariaLabel={isMine ? t('editMyRole') : undefined} />;
}
