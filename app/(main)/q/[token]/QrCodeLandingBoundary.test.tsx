import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import QrCodeLandingBoundary from '@/app/(main)/q/[token]/QrCodeLandingBoundary';

const useQrLinkResolution = vi.fn();

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/hooks/useQrLinks', () => ({ useQrLinkResolution: (token: string) => useQrLinkResolution(token) }));
vi.mock('@/components/invite/InviteLayout', () => ({ InviteLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/invite/AnonymousQrMediaUploadForm', () => ({ AnonymousQrMediaUploadForm: () => <div>upload-form</div> }));
vi.mock('@/components/qrGuest/GuestCodeScreen', () => ({
    GuestCodeScreen: ({ actions }: { actions: string[] }) => <div>{`guest-screen:${actions.join(',')}`}</div>,
}));

function resolve(data: object) {
    useQrLinkResolution.mockReturnValue({ data, isLoading: false, error: null });
}

describe('QrCodeLandingBoundary', () => {
    beforeEach(() => useQrLinkResolution.mockReset());
    afterEach(cleanup);

    it('shows the guest code screen for an active GUEST code', () => {
        resolve({ status: 'ACTIVE', targetType: 'GUEST', guestActions: ['UPLOAD', 'WISH'] });
        render(<QrCodeLandingBoundary token="t" />);
        expect(screen.getByText('guest-screen:UPLOAD,WISH')).toBeInTheDocument();
    });

    it('shows unavailable for an active GUEST code with no actions', () => {
        resolve({ status: 'ACTIVE', targetType: 'GUEST', guestActions: [] });
        render(<QrCodeLandingBoundary token="t" />);
        expect(screen.getByText('unavailable.title')).toBeInTheDocument();
    });

    it('still shows the upload form for a MEDIA_UPLOAD code', () => {
        resolve({ status: 'ACTIVE', targetType: 'MEDIA_UPLOAD' });
        render(<QrCodeLandingBoundary token="t" />);
        expect(screen.getByText('upload-form')).toBeInTheDocument();
    });

    it('shows revoked for a revoked GUEST code', () => {
        resolve({ status: 'REVOKED', targetType: 'GUEST', guestActions: ['WISH'] });
        render(<QrCodeLandingBoundary token="t" />);
        expect(screen.getByText('revoked.title')).toBeInTheDocument();
    });
});
