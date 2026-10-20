import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProAlbumSection } from '@/components/vendors/me/ProAlbumSection';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
vi.mock('@/components/vendors/ProStorageMeter', () => ({ ProStorageMeter: ({ hideLabel }: { hideLabel?: boolean }) => <p>{hideLabel ? 'meter without label' : 'meter'}</p> }));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: ({ alt }: { alt: string }) => <span>{alt}</span> }));
const album = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('@/hooks/useProAlbum', () => ({ useProAlbum: () => album.value }));

beforeEach(() => {
    album.value = {
        items: [{ id: 'mine', mediaType: 'IMAGE', thumbnailUrl: 'https://cdn/t.jpg', mediaUrl: 'https://cdn/m.jpg', originalFilename: 'a.jpg', status: 'READY' }],
        isLoading: false,
        hasNextPage: false,
        loadMore: vi.fn(),
        selectedFiles: [],
        notice: null,
        isUploading: false,
        deleteTargetId: null,
        isDeleting: false,
        chooseFiles: vi.fn(),
        upload: vi.fn(),
        requestDelete: vi.fn(),
        cancelDelete: vi.fn(),
        confirmDelete: vi.fn(),
    };
});
afterEach(cleanup);

describe('ProAlbumSection', () => {
    it('shows the meter, the own items and asks before deleting', () => {
        render(<ProAlbumSection eventId="e1" usedBytes={10} allowanceBytes={100} canUpload />);
        // The section title names the meter, so its own label is hidden.
        expect(screen.getByText('meter without label')).toBeTruthy();
        expect(screen.getByText('a.jpg')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'me.proDelete' }));
        expect(album.value.requestDelete).toHaveBeenCalledWith('mine');
    });

    it('offers the upload button once files are chosen', () => {
        album.value = { ...album.value, selectedFiles: [new File(['x'], 'a.jpg')] };
        render(<ProAlbumSection eventId="e1" usedBytes={10} allowanceBytes={100} canUpload />);
        fireEvent.click(screen.getByRole('button', { name: 'me.proUpload:{"count":1}' }));
        expect(album.value.upload).toHaveBeenCalled();
    });

    it('hides the upload once access has closed, and shows the empty line', () => {
        album.value = { ...album.value, items: [] };
        render(<ProAlbumSection eventId="e1" usedBytes={0} allowanceBytes={100} canUpload={false} />);
        expect(screen.queryByText('me.proChoose')).toBeNull();
        expect(screen.getByText('me.proEmpty')).toBeTruthy();
    });
});
