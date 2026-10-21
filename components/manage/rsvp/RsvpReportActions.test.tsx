import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpReportActions } from '@/components/manage/rsvp/RsvpReportActions';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('RsvpReportActions', () => {
    it('shows print, download and close for a host', () => {
        render(<RsvpReportActions canDownload isDownloading={false} onPrint={vi.fn()} onDownload={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'downloadPdf' })).toBeTruthy();
    });

    it('has no download for a planner', () => {
        render(<RsvpReportActions canDownload={false} isDownloading={false} onPrint={vi.fn()} onDownload={vi.fn()} onClose={vi.fn()} />);
        expect(screen.queryByRole('button', { name: 'downloadPdf' })).toBeNull();
        expect(screen.getByRole('button', { name: 'print' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'close' })).toBeTruthy();
    });
});
