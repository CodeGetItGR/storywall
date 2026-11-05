import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useCallback } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuestCodeScreen } from '@/components/qrGuest/GuestCodeScreen';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/invite/AnonymousQrMediaUploadForm', () => ({ AnonymousQrMediaUploadForm: () => <div>upload-form</div> }));
vi.mock('@/components/qrGuest/GuestWishForm', () => ({ GuestWishForm: () => <div>wish-form</div> }));
vi.mock('@/components/qrGuest/GuestCodeChooser', () => ({
    GuestCodeChooser: function GuestCodeChooserStub({ onChoose }: { onChoose: (action: 'upload' | 'wish') => void }) {
        const handleClick = useCallback(
            (event: React.MouseEvent<HTMLButtonElement>) => onChoose(event.currentTarget.dataset.action as 'upload' | 'wish'),
            [onChoose],
        );
        return (
            <div>
                <button type="button" data-action="upload" onClick={handleClick}>
                    choose-upload
                </button>
                <button type="button" data-action="wish" onClick={handleClick}>
                    choose-wish
                </button>
            </div>
        );
    },
}));

describe('GuestCodeScreen', () => {
    afterEach(cleanup);

    it('opens a wish-only code on the wish form, without a back button', () => {
        render(<GuestCodeScreen token="t" actions={['WISH']} />);
        expect(screen.getByText('wish-form')).toBeInTheDocument();
        expect(screen.getByText('guestCode.wishEyebrow')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /guestCode.back/ })).not.toBeInTheDocument();
    });

    it('opens an upload-only code on the upload form, without a back button', () => {
        render(<GuestCodeScreen token="t" actions={['UPLOAD']} />);
        expect(screen.getByText('upload-form')).toBeInTheDocument();
        expect(screen.getByText('mediaUploadEyebrow')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /guestCode.back/ })).not.toBeInTheDocument();
    });

    it('lets a Bundle code move between the chooser and each form', () => {
        render(<GuestCodeScreen token="t" actions={['UPLOAD', 'WISH']} />);
        expect(screen.getByText('choose-wish')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /guestCode.back/ })).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('choose-wish'));
        expect(screen.getByText('wish-form')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /guestCode.back/ }));
        expect(screen.getByText('choose-upload')).toBeInTheDocument();

        fireEvent.click(screen.getByText('choose-upload'));
        expect(screen.getByText('upload-form')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /guestCode.back/ })).toBeInTheDocument();
    });
});
