'use client';

import { useLocale } from 'next-intl';

import { useMemberRoleCatalog } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import type { AuthorDto } from '@/lib/api/types';
import { canEditOwnRole, memberRoleLabel } from '@/lib/memberRoles';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

// The role chip text for an author, and whether it's the viewer's own
// (editable) role. Both fields are null when the module is off.
export function useAuthorRole(author: AuthorDto | null | undefined) {
    const catalog = useMemberRoleCatalog();
    const locale = useLocale() as Locale;
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();

    const label = author
        ? memberRoleLabel({ roleKey: author.roleKey ?? null, customRole: author.customRole ?? null, eventTypeKey: activeEvent?.eventType, catalog, locale })
        : null;
    const isMine = Boolean(author && activeMember && author.memberId === activeMember.id && canEditOwnRole(activeEvent, activeMember));

    return { label, isMine };
}
