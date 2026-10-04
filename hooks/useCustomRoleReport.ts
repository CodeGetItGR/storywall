'use client';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { AuthorDto } from '@/lib/api/types';
import { canReportCustomRole } from '@/lib/memberRoles';
import { useActiveMember, useContentAccessMode } from '@/providers/EventProvider';

// Whether the viewer may report this author's custom role text.
export function useCustomRoleReport(author: AuthorDto | null | undefined): boolean {
    const activeMember = useActiveMember();
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';
    const { data: appConfig } = useAppConfig();

    return canReportCustomRole({ author, viewerMemberId: activeMember?.id ?? null, isDemoVisitor, reportTargetTypes: appConfig?.reportTargetTypes });
}
