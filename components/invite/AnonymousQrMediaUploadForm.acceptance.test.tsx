import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';
import { ApiError } from '@/lib/api/client';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useFilePreviews', () => ({ useFilePreviews: () => [] }));
vi.mock('@/hooks/useQrMediaUpload', () => ({ useUploadQrMediaBatch: () => ({ isPending: false, mutateAsync }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useTermsVersion', () => ({ termsVersionQueryKey: ['legal', 'terms'], useTermsVersion: () => ({ data: '2026-10-04' }) }));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => ({ data: '2026-09-30' }),
}));
// The checkbox copy and links are covered by AcceptanceCheckboxes.test.
vi.mock('@/components/legal/AcceptanceCheckboxes', () => ({
    AcceptanceCheckboxes: (props: {
        minimumAge?: number;
        accepted: boolean;
        adultConfirmed: boolean;
        onAcceptedChangeAction: () => void;
        onAdultConfirmedChangeAction: () => void;
    }) => (
        <>
            <input type="checkbox" aria-label="documents" checked={props.accepted} onChange={props.onAcceptedChangeAction} />
            <input type="checkbox" aria-label={`age ${props.minimumAge}`} checked={props.adultConfirmed} onChange={props.onAdultConfirmedChangeAction} />
        </>
    ),
}));

function chooseFile(container: HTMLElement) {
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
}

function tickBoth() {
    fireEvent.click(screen.getByRole('checkbox', { name: 'documents' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'age 16' }));
}

// Legal todo #3: a scanner with no account confirms 16+ and accepts the Terms and Guidelines first.
describe('AnonymousQrMediaUploadForm acceptance', () => {
    beforeEach(() => {
        mutateAsync.mockReset();
    });
    afterEach(cleanup);

    it('asks for 16+, and keeps the upload button off until both boxes are ticked', () => {
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);
        chooseFile(container);
        const submit = screen.getByRole('button', { name: /anonymousUpload.submit/ });

        expect(submit).toBeDisabled();
        fireEvent.click(screen.getByRole('checkbox', { name: 'documents' }));
        expect(submit).toBeDisabled();
        fireEvent.click(screen.getByRole('checkbox', { name: 'age 16' }));
        expect(submit).toBeEnabled();
    });

    it('sends the versions in force with the files', async () => {
        mutateAsync.mockResolvedValue({ created: [], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);
        chooseFile(container);
        tickBoth();

        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByText('anonymousUpload.success')).toBeInTheDocument();
        expect(mutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({ token: 't', acceptance: { termsVersion: '2026-10-04', guidelinesVersion: '2026-09-30' } }),
        );
    });

    it('unticks the documents and asks again when the Terms changed meanwhile', async () => {
        mutateAsync.mockImplementation(() => Promise.reject(new ApiError(400, { errorCode: 3043 })));
        const { container } = render(<AnonymousQrMediaUploadForm token="t" />);
        chooseFile(container);
        tickBoth();

        fireEvent.submit(container.querySelector('form')!);

        expect(await screen.findByRole('alert')).toHaveTextContent('anonymousUpload.acceptanceChanged');
        expect(screen.getByRole('checkbox', { name: 'documents' })).not.toBeChecked();
    });
});
