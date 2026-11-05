import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuestCodeChooser } from '@/components/qrGuest/GuestCodeChooser';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

describe('GuestCodeChooser', () => {
    afterEach(cleanup);

    it('offers upload first, then a wish, with an or between them', () => {
        render(<GuestCodeChooser onChoose={vi.fn()} />);
        const buttons = screen.getAllByRole('button');
        expect(buttons.map((b) => b.textContent)).toEqual(['guestCode.uploadButton', 'guestCode.wishButton']);
        expect(screen.getByText('guestCode.or')).toBeInTheDocument();
        expect(screen.getByAltText('photoUpload')).toBeInTheDocument();
        expect(screen.getByAltText('wishbook')).toBeInTheDocument();
    });

    it('tells the page which action was picked', () => {
        const onChoose = vi.fn();
        render(<GuestCodeChooser onChoose={onChoose} />);
        fireEvent.click(screen.getByRole('button', { name: 'guestCode.wishButton' }));
        expect(onChoose).toHaveBeenCalledWith('wish');
    });
});
