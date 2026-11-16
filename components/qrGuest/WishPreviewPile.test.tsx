import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WishPreviewPile } from '@/components/qrGuest/WishPreviewPile';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

// The wish as it will read in the wishbook: the field labels until the guest types, then their words.
describe('WishPreviewPile', () => {
    afterEach(cleanup);

    it('shows the field labels while the form is empty', () => {
        render(<WishPreviewPile message="  " guestName="" />);

        expect(screen.getByText('guestCode.wish.messageLabel')).toBeInTheDocument();
        expect(screen.getByText('— guestCode.wish.nameLabel')).toBeInTheDocument();
    });

    it('shows the wish and the name as typed', () => {
        render(<WishPreviewPile message="Να ζήσετε!" guestName=" Eleni " />);

        expect(screen.getByText('Να ζήσετε!')).toBeInTheDocument();
        expect(screen.getByText('— Eleni')).toBeInTheDocument();
    });
});
