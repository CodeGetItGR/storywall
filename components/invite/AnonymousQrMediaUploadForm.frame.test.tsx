import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';

const { mutateAsync, prepare } = vi.hoisted(() => ({ mutateAsync: vi.fn(), prepare: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useFilePreviews', () => ({
    useFilePreviews: (files: File[]) => files.map((file) => ({ file, url: `blob:${file.name}`, isVideo: false })),
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: ({ src }: { src: string }) => <span data-preview={src} /> }));
vi.mock('@/hooks/useMedia', () => ({ useUploadMediaBatch: () => ({ isPending: false, mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/useQrMediaUpload', () => ({ useUploadQrMediaBatch: () => ({ isPending: false, mutateAsync }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useTermsVersion', () => ({ termsVersionQueryKey: ['legal', 'terms'], useTermsVersion: () => ({ data: '2026-10-04' }) }));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => ({ data: '2026-09-30' }),
}));
vi.mock('@/components/legal/SignupAcceptanceCheckbox', () => ({
    SignupAcceptanceCheckbox: (props: { checked: boolean; onChangeAction: () => void }) => (
        <input type="checkbox" aria-label="accept" checked={props.checked} onChange={props.onChangeAction} />
    ),
}));
vi.mock('@/hooks/useUploadFrame', () => ({
    useUploadFrame: (source: unknown) => ({
        control: source
            ? { on: true, toggle: vi.fn(), previewSrc: 'data:image/svg+xml,x', label: 'Add frame', alt: 'Graduation frame preview' }
            : null,
        prepare,
    }),
}));

afterEach(() => {
    cleanup();
    mutateAsync.mockReset();
    prepare.mockReset();
});

const source = { eventId: 'e1', frame: 'CLASSIC' as const, title: 'Maria', startAt: '2026-07-01T10:00:00Z', timezone: 'Europe/Athens' };

describe('AnonymousQrMediaUploadForm frame', () => {
    it('sends the framed photos and tells the uploader about any that went without', async () => {
        const original = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        const framed = new File(['y'], 'a.jpg', { type: 'image/jpeg' });
        prepare.mockResolvedValue({ files: [framed], notice: 'UploadFrame.unframed' });
        mutateAsync.mockResolvedValue({ created: [{ id: 'm', originalFilename: 'a.jpg' }], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" frameSource={source} />);

        expect(screen.getByRole('switch', { name: 'Add frame' })).toBeInTheDocument();
        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [original] } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'accept' }));
        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ files: [framed] })));
        expect(prepare).toHaveBeenCalledWith([original]);
        expect(await screen.findByText('UploadFrame.unframed')).toBeInTheDocument();
    });

    it('keeps the unframed notice when a retry of the refused photos has none', async () => {
        const gif = new File(['g'], 'a.gif', { type: 'image/gif' });
        const jpeg = new File(['j'], 'b.jpg', { type: 'image/jpeg' });
        prepare.mockResolvedValueOnce({ files: [gif, jpeg], notice: 'UploadFrame.unframed' }).mockResolvedValueOnce({ files: [jpeg], notice: null });
        mutateAsync
            .mockResolvedValueOnce({ created: [{ id: 'm', originalFilename: 'a.gif' }], failed: [{ filename: 'b.jpg', errorCode: 'X' }] })
            .mockResolvedValueOnce({ created: [{ id: 'n', originalFilename: 'b.jpg' }], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" frameSource={source} />);

        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [gif, jpeg] } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'accept' }));
        fireEvent.submit(container.querySelector('form')!);
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        await screen.findByRole('alert');
        fireEvent.submit(container.querySelector('form')!);

        await screen.findByText('anonymousUpload.success');
        expect(screen.getByText('UploadFrame.unframed')).toBeInTheDocument();

        // Starting over drops it.
        fireEvent.click(screen.getByRole('button', { name: 'anonymousUpload.uploadMore' }));
        expect(screen.queryByText('UploadFrame.unframed')).not.toBeInTheDocument();
    });

    it('locks the picker and the remove buttons while framing runs', async () => {
        const photo = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        let finish!: (value: { files: File[]; notice: null }) => void;
        prepare.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        mutateAsync.mockResolvedValue({ created: [], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" frameSource={source} />);

        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [photo] } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'accept' }));
        expect(container.querySelector('input[type="file"]')).toBeEnabled();
        expect(screen.getByRole('button', { name: 'anonymousUpload.removeFile' })).toBeEnabled();

        fireEvent.submit(container.querySelector('form')!);
        await waitFor(() => expect(container.querySelector('input[type="file"]')).toBeDisabled());
        expect(screen.getByRole('button', { name: 'anonymousUpload.removeFile' })).toBeDisabled();

        finish({ files: [photo], notice: null });
        await screen.findByText('anonymousUpload.success');
    });

    it('locks the picker and the remove buttons while the upload runs', async () => {
        const photo = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        let finish!: (value: { created: never[]; failed: never[] }) => void;
        mutateAsync.mockReturnValue(new Promise((resolve) => (finish = resolve)));
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);

        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [photo] } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'accept' }));
        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => expect(container.querySelector('input[type="file"]')).toBeDisabled());
        expect(screen.getByRole('button', { name: 'anonymousUpload.removeFile' })).toBeDisabled();

        finish({ created: [], failed: [] });
        await screen.findByText('anonymousUpload.success');
    });

    it('has no switch when the event has no frame', () => {
        render(<AnonymousQrMediaUploadForm token="t" />);
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });
});
