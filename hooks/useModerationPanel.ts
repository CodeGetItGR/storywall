'use client';

import { useState } from 'react';

import { useAdminModerationCases } from '@/hooks/useAdminModeration';
import type { ModerationCaseStatus, ReportTargetType } from '@/lib/api/types';

export type SelectedCase = { targetType: ReportTargetType; targetId: string };

export function useModerationPanel() {
    const [status, setStatusState] = useState<ModerationCaseStatus>('OPEN');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<SelectedCase | null>(null);
    const casesQuery = useAdminModerationCases(status, page);

    function setStatus(next: ModerationCaseStatus) {
        setStatusState(next);
        setPage(0);
    }

    return { status, setStatus, page, setPage, casesQuery, selected, openCase: setSelected, closeCase: () => setSelected(null) };
}
