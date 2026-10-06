import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { WishbookBookDto } from '@/lib/api/types';

import { WishbookBookPanel } from './WishbookBookPanel';

let book: WishbookBookDto | null = null;
let bookError: unknown = null;
let requestError: unknown = null;
let requestPending = false;
const request = vi.fn();
const refetch = vi.fn();
const freshBook = vi.fn();
const assign = vi.fn();
const originalLocation = window.location;

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({
    useApiErrorMessage: () => (error: ApiError) => `error-${(error.body as { errorCode: number }).errorCode}`,
}));
vi.mock('./WishbookBookTextsModal', () => ({ WishbookBookTextsModal: () => <div data-testid="texts-modal" /> }));
vi.mock('@/hooks/useWishbookBook', () => ({
    useWishbookBook: () => ({ data: book, isLoading: false, isError: bookError !== null, error: bookError, refetch, isFetching: false }),
    useRequestWishbookBook: () => ({ mutate: request, isPending: requestPending, error: requestError }),
    useFreshBook: () => freshBook,
}));

afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.useRealTimers();
});
beforeEach(() => {
    book = null;
    bookError = null;
    requestError = null;
    requestPending = false;
    request.mockReset();
    refetch.mockReset();
    freshBook.mockReset();
    assign.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, assign } });
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

    const ready = { ...base, status: 'READY' as const, pageCount: 12, entryCount: 30, downloadUrl: 'https://old' };

    it('downloads with a freshly signed URL, by navigating to it', async () => {
        book = ready;
        freshBook.mockResolvedValue({ ...ready, downloadUrl: 'https://fresh' });
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://fresh'));
    });

    it('says so when the fresh read is READY but has no download link', async () => {
        book = ready;
        freshBook.mockResolvedValue({ ...ready, downloadUrl: null });
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        expect(await screen.findByText('book.downloadFailed')).toBeTruthy();
        expect(assign).not.toHaveBeenCalled();
    });

    it('says so when the fresh read throws', async () => {
        book = ready;
        freshBook.mockRejectedValue(new ApiError(500, null));
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        expect(await screen.findByText('book.downloadFailed')).toBeTruthy();
        expect(assign).not.toHaveBeenCalled();
    });

    it('does not blame the download when the book has meanwhile stopped being READY', async () => {
        book = ready;
        freshBook.mockResolvedValue({ ...base, status: 'QUEUED', requestedAt: '2026-10-06T11:00:00Z' });
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        await vi.waitFor(() => expect(freshBook).toHaveBeenCalled());
        await Promise.resolve();
        expect(screen.queryByText('book.downloadFailed')).toBeNull();
        expect(assign).not.toHaveBeenCalled();
    });

    it('drops a download error once the book changes', async () => {
        book = ready;
        freshBook.mockRejectedValue(new ApiError(500, null));
        const { rerender } = render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        expect(await screen.findByText('book.downloadFailed')).toBeTruthy();
        book = { ...base, status: 'RUNNING', requestedAt: '2026-10-06T11:00:00Z' };
        rerender(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.queryByText('book.downloadFailed')).toBeNull();
    });

    it('cannot rebuild while a download is being prepared, and marks the download busy', async () => {
        book = ready;
        freshBook.mockReturnValue(new Promise(() => undefined));
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        fireEvent.click(screen.getByText('book.download'));
        const download = screen.getByText('book.download').closest('button') as HTMLButtonElement;
        await vi.waitFor(() => expect(download.getAttribute('aria-busy')).toBe('true'));
        expect((screen.getByText('book.rebuild').closest('button') as HTMLButtonElement).disabled).toBe(true);
        expect(download.disabled).toBe(true);
    });

    it.each(['RUNNING', 'QUEUED', 'READY'] as const)('shows a retry, not a spinner, when a read fails with a cached %s book', (status) => {
        book = { ...base, status, pageCount: 1, entryCount: 1 };
        bookError = new ApiError(500, { errorCode: 1234 });
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText('error-1234')).toBeTruthy();
        expect(screen.queryByText('book.building')).toBeNull();
        fireEvent.click(screen.getByText('book.retry'));
        expect(refetch).toHaveBeenCalledTimes(1);
        expect(request).not.toHaveBeenCalled();
    });

    it('shows a retry when the very first read fails', () => {
        bookError = new ApiError(500, { errorCode: 1234 });
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText('error-1234')).toBeTruthy();
        expect(screen.queryByText('book.create')).toBeNull();
        fireEvent.click(screen.getByText('book.retry'));
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('announces its status politely', () => {
        book = { ...base, status: 'RUNNING' };
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        const status = screen.getByRole('status');
        expect(status.getAttribute('aria-live')).toBe('polite');
        expect(status.textContent).toContain('book.building');
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

    it.each([5148, 5149])('shows the error of a refused build request (%i) and never asks again by itself', (errorCode) => {
        vi.useFakeTimers();
        requestError = new ApiError(errorCode === 5148 ? 409 : 503, { errorCode });
        render(<WishbookBookPanel eventId="e1" canEditTexts />);
        expect(screen.getByText(`error-${errorCode}`)).toBeTruthy();
        vi.advanceTimersByTime(120_000);
        expect(request).not.toHaveBeenCalled();
        expect(refetch).not.toHaveBeenCalled();
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
