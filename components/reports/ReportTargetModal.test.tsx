import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportTargetModal } from '@/components/reports/ReportTargetModal';
import type { ReportTargetType } from '@/lib/api/types';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: { name?: string }) => (values?.name ? `${key}:${values.name}` : key),
}));
vi.mock('@/components/ui/modal', () => {
    function Modal({ open, children }: { open: boolean; children: ReactNode }) {
        return open ? <div>{children}</div> : null;
    }
    Modal.Body = function Body({ children }: { children: ReactNode }) {
        return <div>{children}</div>;
    };
    return { Modal };
});
vi.mock('@/hooks/useAppConfig', () => ({
    useAppConfig: () => ({ data: { reportTargetTypes: [], reportReasons: [], contentLimits: { reportDescriptionMaxLength: 1000 } } }),
}));
vi.mock('@/hooks/useReportSubmission', () => ({
    useReportSubmission: () => ({
        description: '',
        error: null,
        isSubmitting: false,
        reason: '',
        setDescription: vi.fn(),
        setReason: vi.fn(),
        submit: vi.fn(),
    }),
}));

afterEach(cleanup);

function renderModal(targetType: ReportTargetType) {
    render(<ReportTargetModal eventId="e1" open targetId="t1" targetName="Alice" targetType={targetType} onCloseAction={vi.fn()} />);
}

describe('ReportTargetModal body', () => {
    it('names the member when reporting a member', () => {
        renderModal('MEMBER');

        expect(screen.getByText('body:Alice')).toBeTruthy();
    });

    it.each<ReportTargetType>(['POST', 'COMMENT', 'STORY', 'MEDIA', 'WISHBOOK_ENTRY', 'PLAYLIST_SUGGESTION'])(
        'uses the %s sentence, without the name, for content',
        (type) => {
            renderModal(type);

            expect(screen.getByText(`bodyByType.${type}`)).toBeTruthy();
            expect(screen.queryByText(/Alice/)).toBeNull();
        },
    );
});
