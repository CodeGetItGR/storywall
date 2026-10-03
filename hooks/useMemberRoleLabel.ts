'use client';

import { useLocale } from 'next-intl';

import { useMemberRoleCatalog } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { memberRoleLabel } from '@/lib/memberRoles';

// A member's role in one event as display text, or null when they have none.
export function useMemberRoleLabel(
    member: Pick<EventMemberResponseDto, 'relationshipRole' | 'customRelationshipRole'>,
    eventTypeKey: string | null | undefined,
): string | null {
    const catalog = useMemberRoleCatalog();
    const locale = useLocale() as Locale;

    return memberRoleLabel({
        roleKey: member.relationshipRole,
        customRole: member.customRelationshipRole,
        eventTypeKey,
        catalog,
        locale,
    });
}
