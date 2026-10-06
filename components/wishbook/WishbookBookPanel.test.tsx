import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { WishbookBookDto } from '@/lib/api/types';

import { WishbookBookPanel } from './WishbookBookPanel';

let book: WishbookBookDto | null = null;
let requestError: unknown = null;
let requestPending = false;
const request = vi.fn();
const freshUrl = vi.fn();
const downloadUrl = vi.fn();

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: ApiError) => `error-${(error.body as { errorCode: number }).errorCode}`,
}));
vi.mock('@/lib/download', () => ({ downloadUrl: (...a: unknown[]) => downloadUrl(...a) }));
vi.mock('./WishbookBookTextsModal', () => ({ WishbookBookTextsModal: () => <div data-testid="texts-modal" /> }));
vi.mock('@/hooks/useWishbookBook', () => ({
    useWishbookBook: () => ({ data: book, isLoading: false }),
    useRequestWishbookBook: () => ({ mutate: request, isPending: requestPending, error: requestError }),
    useFreshBookDownloadUrl: () => freshUrl,
}));

afterEach(cleanup);
beforeEach(() => {
    book = null;
    requestError = null;
    requestPending = false;
    request.mockReset();
    freshUrl.mockReset();
    downloadUrl.mockReset();
});

const base = { requestedAt: '2026-10-06T10:00:00Z', finishedAt: null, pageCount: null, entryCount: null, byteSize: null, failureCode: null, downloadUrl: null };

describe('WishbookBookPanel', () => {
    it('offers to create a book that was never built', () => {
        book = null;
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.create'));
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('shows progress while building, with no buttons', () => {
        book = { ...base, status: 'RUNNING' };
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText('book.building')).toBeTruthy();
        expect(screen.queryByText('book.create')).toBeNull();
        expect(screen.queryByText('book.download')).toBeNull();
    });

    it('shows progress while the request itself is in flight', () => {
        requestPending = true;
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText('book.building')).toBeTruthy();
        expect(screen.queryByText('book.create')).toBeNull();
    });

    it('downloads with a freshly signed URL', async () => {
        book = { ...base, status: 'READY', pageCount: 12, entryCount: 30, downloadUrl: 'https://old' };
        freshUrl.mockResolvedValue('https://fresh');
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        await vi.waitFor(() => expect(downloadUrl).toHaveBeenCalledWith('https://fresh', ''));
    });

    it('says so when the fresh read has no download link', async () => {
        book = { ...base, status: 'READY', pageCount: 12, entryCount: 30, downloadUrl: 'https://old' };
        freshUrl.mockResolvedValue(null);
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        expect(await screen.findByText('book.downloadFailed')).toBeTruthy();
        expect(downloadUrl).not.toHaveBeenCalled();
    });

    it('offers a retry after a failure, with the generic line', () => {
        book = { ...base, status: 'FAILED', failureCode: 'RENDERER_TIMEOUT' };
        render(<WishbookBookPanel eventId="e1" canEditTexts={false} />);
        expect(screen.getByText('book.failed')).toBeTruthy();
        fireEvent.click(screen.getByText('book.retry'));
        expect(request).toHaveBeenCalled();
        expect(screen.queryByText('book.editTexts')).toBeNull();
    });

    it.each(['MODULE_UNAVAILABLE', 'EVENT_SUSPENDED', 'SOMETHING_NEW'])('uses the generic line and retry for %s', (failureCode) => {
        book = { ...base, status: 'FAILED', failureCode };
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText('book.failed')).toBeTruthy();
        expect(screen.queryByText('book.contentChanged')).toBeNull();
        expect(screen.getByText('book.retry')).toBeTruthy();
        expect(screen.queryByText('book.create')).toBeNull();
    });

    it('explains a removed wish and offers to create the book again', () => {
        book = { ...base, status: 'FAILED', failureCode: 'CONTENT_CHANGED' };
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText('book.contentChanged')).toBeTruthy();
        expect(screen.queryByText('book.failed')).toBeNull();
        expect(screen.queryByText('book.retry')).toBeNull();
        fireEvent.click(screen.getByText('book.create'));
        expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([5148, 5149])('shows the error of a refused build request (%i) and does not ask again by itself', (errorCode) => {
        requestError = new ApiError(errorCode === 5148 ? 409 : 503, { errorCode });
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText(`error-${errorCode}`)).toBeTruthy();
        expect(request).not.toHaveBeenCalled();
    });

    it('opens the text editor only when allowed', () => {
        book = { ...base, status: 'READY', pageCount: 1, entryCount: 1 };
        const { rerender } = render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.editTexts'));
        expect(screen.getByTestId('texts-modal')).toBeTruthy();
        rerender(<WishbookBookPanel eventId="e1" canEditTexts={false} />);
        expect(screen.queryByTestId('texts-modal')).toBeNull();
        expect(screen.queryByText('book.editTexts')).toBeNull();
    });
});
