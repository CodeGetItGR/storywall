'use client';

import { useState } from 'react';

import { useAdminModerationCases } from '@/hooks/useAdminModeration';
import type { ModerationCaseStatus, ReportTargetType } from '@/lib/api/types';

export type ModerationView = ModerationCaseStatus | 'NOTICES';

export type SelectedCase = { targetType: ReportTargetType; targetId: string };

export function useModerationPanel() {
    const [status, setStatusState] = useState<ModerationView>('OPEN');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<SelectedCase | null>(null);
    const casesQuery = useAdminModerationCases(status === 'NOTICES' ? 'OPEN' : status, page, status !== 'NOTICES');

    function setStatus(next: ModerationView) {
        setStatusState(next);
        setPage(0);
    }

    return { status, setStatus, page, setPage, casesQuery, selected, openCase: setSelected, closeCase: () => setSelected(null) };
}
