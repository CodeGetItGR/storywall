import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemberArchiveModal } from '@/components/gallery/MemberArchiveModal';
import type { MemberArchiveResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    data: undefined as MemberArchiveResponseDto | undefined,
    refetch: vi.fn(),
    assign: vi.fn(),
}));

vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
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
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useMemberArchive', () => ({
    useMemberArchive: () => ({ data: mocks.data, isLoading: false, isError: false, error: null, refetch: mocks.refetch }),
}));
vi.mock('@/lib/navigation', () => ({ assignLocation: mocks.assign }));

afterEach(() => {
    cleanup();
    mocks.data = undefined;
    mocks.refetch.mockReset();
    mocks.assign.mockReset();
});

function renderModal() {
    render(<MemberArchiveModal eventId="e1" open onClose={vi.fn()} />);
}

const onePart = (url: string): MemberArchiveResponseDto => ({
    status: 'READY',
    availableFrom: null,
    parts: [{ part: 1, totalParts: 1, bytes: 10, url }],
});

describe('MemberArchiveModal', () => {
    it('says when it will be ready', () => {
        mocks.data = { status: 'NOT_YET', availableFrom: '2026-10-11T20:00:00Z', parts: [] };
        renderModal();
        expect(screen.getByText(/^memberArchiveNotYet:/)).toBeTruthy();
    });

    it('says it is being prepared', () => {
        mocks.data = { status: 'PREPARING', availableFrom: null, parts: [] };
        renderModal();
        expect(screen.getByText('memberArchivePreparing')).toBeTruthy();
    });

    it('says when it is not available', () => {
        mocks.data = { status: 'UNAVAILABLE', availableFrom: null, parts: [] };
        renderModal();
        expect(screen.getByText('memberArchiveUnavailable')).toBeTruthy();
    });

    it('shows the empty state for a READY archive with no parts', () => {
        mocks.data = { status: 'READY', availableFrom: null, parts: [] };
        renderModal();
        expect(screen.getByText('archiveEmpty')).toBeTruthy();
    });

    it('downloads a part through a freshly fetched link, not the one on screen', async () => {
        mocks.data = onePart('https://r2/old');
        mocks.refetch.mockResolvedValue({ data: onePart('https://r2/fresh') });
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: /archivePartLabel/ }));

        await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith('https://r2/fresh'));
    });

    it('tells the member when the archive was withdrawn between showing and clicking', async () => {
        mocks.data = onePart('https://r2/old');
        mocks.refetch.mockResolvedValue({ data: { status: 'PREPARING', availableFrom: null, parts: [] } });
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: /archivePartLabel/ }));

        await waitFor(() => expect(screen.getByText('memberArchiveChanged')).toBeTruthy());
        expect(mocks.assign).not.toHaveBeenCalled();
    });
});
