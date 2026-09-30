import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useFilePreviews', () => ({ useFilePreviews: () => [] }));
vi.mock('@/hooks/useQrMediaUpload', () => ({ useUploadQrMediaBatch: () => ({ isPending: false, mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));

describe('AnonymousQrMediaUploadForm guidelines notice', () => {
    afterEach(cleanup);

    it('tells the uploader they agree to the guidelines and links them', () => {
        render(<AnonymousQrMediaUploadForm token="t" />);

        expect(screen.getByText(/anonymousUpload.guidelinesNotice/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'anonymousUpload.guidelinesLink' })).toHaveAttribute(
            'href',
            '/legal/community-guidelines',
        );
    });
});
