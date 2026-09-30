import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportTargetModal } from '@/components/reports/ReportTargetModal';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
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
    useAppConfig: () => ({
        data: { reportTargetTypes: ['MEDIA'], reportReasons: ['SPAM', 'HARASSMENT'], contentLimits: { reportDescriptionMaxLength: 1000 } },
    }),
}));
vi.mock('@/hooks/useReports', () => ({
    useCreateReport: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

afterEach(cleanup);

function dialog(open: boolean, targetId: string) {
    return <ReportTargetModal eventId="e1" open={open} targetId={targetId} targetType="MEDIA" onCloseAction={vi.fn()} />;
}

function fillForm() {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'SPAM' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Looks like an ad' } });
}

describe('ReportTargetModal draft', () => {
    it('opens empty on another item after the previous draft was closed', () => {
        const { rerender } = render(dialog(true, 'media-a'));
        fillForm();
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('SPAM');

        rerender(dialog(false, 'media-a'));
        rerender(dialog(true, 'media-b'));

        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
        expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    });

    it('opens empty when reopened on the same item', () => {
        const { rerender } = render(dialog(true, 'media-a'));
        fillForm();

        rerender(dialog(false, 'media-a'));
        rerender(dialog(true, 'media-a'));

        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
        expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
    });

    it('keeps the draft while the dialog stays open', () => {
        const { rerender } = render(dialog(true, 'media-a'));
        fillForm();

        rerender(dialog(true, 'media-a'));

        expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Looks like an ad');
    });
});
