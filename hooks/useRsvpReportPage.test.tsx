import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRsvpReportPage } from '@/hooks/useRsvpReportPage';

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    download: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ eventId: 'e1' }),
}));

vi.mock('@/hooks/useRsvps', () => ({
    useRsvpReport: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock('@/hooks/useRsvpReportDownload', () => ({
    useRsvpReportDownload: () => ({ download: mocks.download, downloadingType: 'FULL_LIST', error: 'failed' }),
}));

describe('useRsvpReportPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('closes to the RSVP Reports sub-tab, never back()', () => {
        const { result } = renderHook(() => useRsvpReportPage('FULL_LIST'));

        result.current.onClose();

        expect(mocks.push).toHaveBeenCalledWith('/events/e1/manage?tab=rsvp&section=reports');
    });

    it('downloads the current report type', () => {
        const { result } = renderHook(() => useRsvpReportPage('FULL_LIST'));

        result.current.onDownload();

        expect(mocks.download).toHaveBeenCalledWith('FULL_LIST');
    });

    it('passes through the downloading state and error from useRsvpReportDownload', () => {
        const { result } = renderHook(() => useRsvpReportPage('FULL_LIST'));

        expect(result.current.isDownloading).toBe(true);
        expect(result.current.downloadError).toBe('failed');
    });
});
