import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import type { MediaBatchUploadResponseDto } from '@/lib/api/types';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useFilePreviews', () => ({
    useFilePreviews: (files: File[]) => files.map((file) => ({ file, url: `blob:${file.name}`, isVideo: false })),
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: ({ src }: { src: string }) => <span data-preview={src} /> }));
vi.mock('@/hooks/useQrMediaUpload', () => ({ useUploadQrMediaBatch: () => ({ isPending: false, mutateAsync }) }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));

function file(name: string) {
    return new File(['x'], name, { type: 'image/jpeg' });
}

function chooseAndSubmit(container: HTMLElement, files: File[]) {
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files } });
    fireEvent.submit(container.querySelector('form')!);
}

function result(created: string[], failed: [string, string][]): MediaBatchUploadResponseDto {
    return {
        created: created.map((name) => ({ id: name, originalFilename: name }) as MediaBatchUploadResponseDto['created'][number]),
        failed: failed.map(([filename, errorCode]) => ({ filename, errorCode, message: '' })),
    };
}

describe('AnonymousQrMediaUploadForm per-file failures', () => {
    beforeEach(() => mutateAsync.mockReset());
    afterEach(cleanup);

    it('thanks the uploader when every file was taken', async () => {
        mutateAsync.mockResolvedValue(result(['a.jpg'], []));
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);

        chooseAndSubmit(container, [file('a.jpg')]);

        expect(await screen.findByText('anonymousUpload.success')).toBeInTheDocument();
    });

    // The batch answers 200 whatever happened to each file; a refused file must not read as sent.
    it('keeps the refused files and says the upload limit was reached', async () => {
        mutateAsync.mockResolvedValue(result(['b.jpg'], [['a.jpg', 'RATE_LIMITED']]));
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);

        chooseAndSubmit(container, [file('a.jpg'), file('b.jpg')]);

        expect(await screen.findByRole('alert')).toHaveTextContent('anonymousUpload.rateLimited');
        expect(screen.queryByText('anonymousUpload.success')).not.toBeInTheDocument();
        expect(container.querySelectorAll('[data-preview]')).toHaveLength(1);
        expect(container.querySelector('[data-preview]')).toHaveAttribute('data-preview', 'blob:a.jpg');
    });

    it('says how many files failed for any other reason', async () => {
        mutateAsync.mockResolvedValue(result([], [['a.jpg', 'UNSUPPORTED_MEDIA_FORMAT'], ['b.jpg', 'MEDIA_FILE_CORRUPT']]));
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);

        chooseAndSubmit(container, [file('a.jpg'), file('b.jpg')]);

        expect(await screen.findByRole('alert')).toHaveTextContent('anonymousUpload.someFailed:{"count":2}');
        expect(container.querySelectorAll('[data-preview]')).toHaveLength(2);
    });
});
