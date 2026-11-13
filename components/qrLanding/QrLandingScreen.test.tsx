import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrLandingScreen } from '@/components/qrLanding/QrLandingScreen';
import type { useQrLanding } from '@/hooks/useQrLanding';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/invite/AnonymousQrMediaUploadForm', () => ({ AnonymousQrMediaUploadForm: () => <div>upload form</div> }));
vi.mock('@/components/qrGuest/GuestWishForm', () => ({ GuestWishForm: () => <div>wish form</div> }));

type Landing = ReturnType<typeof useQrLanding>;

const landing = (overrides: Partial<Landing>) =>
    ({
        view: 'upload',
        canGoBack: true,
        isSent: false,
        back: vi.fn(),
        setIsSent: vi.fn(),
        uploadToken: 'up',
        wishToken: 'wish',
        member: null,
        plan: { choices: ['join', 'upload'], joinInviteToken: 'inv', uploadToken: 'up', wishToken: null },
        eventId: 'e1',
        choose: vi.fn(),
        ...overrides,
    }) as unknown as Landing;

// KAN-208: the form's header is a round back arrow with the label centred, and the sent screen has none.
describe('QrLandingScreen', () => {
    afterEach(cleanup);

    it('shows the back arrow and the label above the upload form', () => {
        render(<QrLandingScreen landing={landing({})} />);

        expect(screen.getByRole('button', { name: 'guestCode.back' })).toBeInTheDocument();
        expect(screen.getByText('mediaUploadEyebrow')).toBeInTheDocument();
    });

    it('shows the label without an arrow when the code opens the form directly', () => {
        render(<QrLandingScreen landing={landing({ canGoBack: false, view: 'wish' })} />);

        expect(screen.queryByRole('button', { name: 'guestCode.back' })).toBeNull();
        expect(screen.getByText('guestCode.wishEyebrow')).toBeInTheDocument();
    });

    it('hides the arrow and the label on the sent screen', () => {
        render(<QrLandingScreen landing={landing({ isSent: true })} />);

        expect(screen.queryByRole('button', { name: 'guestCode.back' })).toBeNull();
        expect(screen.queryByText('mediaUploadEyebrow')).toBeNull();
        expect(screen.getByText('upload form')).toBeInTheDocument();
    });
});
