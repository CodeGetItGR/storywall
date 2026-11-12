import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { ApiError } from '@/lib/api/client';

const { mutateAsync, memberMutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn(), memberMutateAsync: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useFilePreviews', () => ({ useFilePreviews: () => [] }));
vi.mock('@/hooks/useQrMediaUpload', () => ({ useUploadQrMediaBatch: () => ({ isPending: false, mutateAsync }) }));
vi.mock('@/hooks/useMedia', () => ({ useUploadMediaBatch: () => ({ isPending: false, mutateAsync: memberMutateAsync }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useTermsVersion', () => ({ termsVersionQueryKey: ['legal', 'terms'], useTermsVersion: () => ({ data: '2026-10-04' }) }));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => ({ data: '2026-09-30' }),
}));
// The checkbox copy and links are covered by SignupAcceptanceCheckbox's own use at sign-up.
vi.mock('@/components/legal/SignupAcceptanceCheckbox', () => ({
    SignupAcceptanceCheckbox: (props: { minimumAge?: number; checked: boolean; onChangeAction: () => void }) => (
        <input type="checkbox" aria-label={`accept ${props.minimumAge}`} checked={props.checked} onChange={props.onChangeAction} />
    ),
}));

function chooseFile(container: HTMLElement) {
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
}

function tickBox() {
    fireEvent.click(screen.getByRole('checkbox', { name: 'accept 16' }));
}

// Legal todo #3: a scanner with no account confirms 16+ and accepts the Terms and Guidelines first.
describe('AnonymousQrMediaUploadForm acceptance', () => {
    beforeEach(() => {
        mutateAsync.mockReset();
        memberMutateAsync.mockReset();
    });
    afterEach(cleanup);

    it('asks for 16+ in one box, and keeps the upload button off until it is ticked', () => {
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);
        chooseFile(container);
        const submit = screen.getByRole('button', { name: /anonymousUpload.submit/ });

        expect(screen.getAllByRole('checkbox')).toHaveLength(1);
        expect(submit).toBeDisabled();
        tickBox();
        expect(submit).toBeEnabled();
    });

    // KAN-208: a signed-in member uploads as themselves, with no box to tick.
    it('lets a member upload under their own name with no box', async () => {
        memberMutateAsync.mockResolvedValue({ created: [], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" member={{ eventId: 'e1', displayName: 'Maria' }} />);
        chooseFile(container);

        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.getByDisplayValue('Maria')).toHaveAttribute('readonly');
        expect(screen.getByRole('button', { name: /anonymousUpload.submit/ })).toBeEnabled();

        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByText('anonymousUpload.success')).toBeInTheDocument();
        expect(memberMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1' }));
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('sends the versions in force with the files', async () => {
        mutateAsync.mockResolvedValue({ created: [], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);
        chooseFile(container);
        tickBox();

        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByText('anonymousUpload.success')).toBeInTheDocument();
        expect(mutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({ token: 't', acceptance: { termsVersion: '2026-10-04', guidelinesVersion: '2026-09-30' } }),
        );
    });

    // KAN-208: the sent screen shows its drawing, and Upload more opens an empty form with the name kept and the box to tick again.
    it('goes back to the form for another set from the sent screen', async () => {
        mutateAsync.mockResolvedValue({ created: [], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);
        fireEvent.change(screen.getByPlaceholderText('anonymousUpload.namePlaceholder'), { target: { value: 'Nikos' } });
        chooseFile(container);
        tickBox();
        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByRole('img', { name: 'qrUploadSent' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'anonymousUpload.uploadMore' }));

        expect(screen.getByDisplayValue('Nikos')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'accept 16' })).not.toBeChecked();
        expect(screen.getByRole('button', { name: /anonymousUpload.submit/ })).toBeDisabled();
    });

    it('unticks the documents and asks again when the Terms changed meanwhile', async () => {
        mutateAsync.mockImplementation(() => Promise.reject(new ApiError(400, { errorCode: 3043 })));
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);
        chooseFile(container);
        tickBox();

        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByRole('alert')).toHaveTextContent('anonymousUpload.acceptanceChanged');
        expect(screen.getByRole('checkbox', { name: 'accept 16' })).not.toBeChecked();
    });
});
