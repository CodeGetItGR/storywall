import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { InvitationShareCard } from '@/components/saveMyDate/published/InvitationShareCard';

const CARD = { background: '#f8f3e8', color: '#703c77', accent: '#be92c3', fontFamily: 'Alegreya' };

afterEach(cleanup);

describe('InvitationShareCard', () => {
    it('shows the title on the theme colours at the preview size', () => {
        const { container } = render(<InvitationShareCard text="Άγγελος & Αλεξάνδρα" {...CARD} />);
        const card = container.firstElementChild as HTMLElement;
        expect(screen.getByText('Άγγελος & Αλεξάνδρα')).toBeInTheDocument();
        expect(card.style).toMatchObject({ width: '1200px', height: '630px', fontFamily: 'Alegreya' });
        expect(card.style.background).toBe('rgb(248, 243, 232)');
        expect(card.style.color).toBe('rgb(112, 60, 119)');
        expect((card.firstElementChild as HTMLElement).style.border).toBe('3px solid rgb(190, 146, 195)');
    });

    it('sets a long title smaller', () => {
        render(<InvitationShareCard text="Αφροδίτη" {...CARD} />);
        expect(screen.getByText('Αφροδίτη').style.fontSize).toBe('96px');
        cleanup();
        render(<InvitationShareCard text={'Μαρία-Ελένη & Κωνσταντίνος-Αλέξανδρος Γεωργίου'} {...CARD} />);
        expect(screen.getByText(/Μαρία-Ελένη/).style.fontSize).toBe('72px');
    });
});
