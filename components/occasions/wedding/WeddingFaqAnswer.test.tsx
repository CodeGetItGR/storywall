import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WeddingFaqAnswer } from '@/components/occasions/wedding/WeddingFaqAnswer';

afterEach(cleanup);

describe('WeddingFaqAnswer', () => {
    it('adds the link after the answer', () => {
        render(<WeddingFaqAnswer answer="Plans start at 119€." href="#pricing" label="See the plans" />);
        expect(screen.getByRole('link', { name: 'See the plans' })).toHaveAttribute('href', '#pricing');
        expect(screen.getByText(/Plans start at 119€\./)).toBeInTheDocument();
    });

    it('shows the answer alone when the link has nowhere to go', () => {
        render(<WeddingFaqAnswer answer="Put the QR code on the tables." href={null} label="About wedding QR codes" />);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('Put the QR code on the tables.')).toBeInTheDocument();
    });
});
