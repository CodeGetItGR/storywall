import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { LitePlansTeaser } from '@/components/plan/LitePlansTeaser';

function Harness() {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen((current) => !current), []);
    return (
        <LitePlansTeaser label="From 29€" onToggleAction={toggle} open={open}>
            <p>lite cards</p>
        </LitePlansTeaser>
    );
}

describe('LitePlansTeaser', () => {
    afterEach(cleanup);

    it('shows the cards only while open', () => {
        render(<Harness />);
        const button = screen.getByRole('button', { name: 'From 29€' });
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('lite cards')).toBeNull();

        fireEvent.click(button);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('lite cards')).toBeTruthy();
        expect(document.getElementById(button.getAttribute('aria-controls') ?? '')).toBeTruthy();

        fireEvent.click(button);
        expect(screen.queryByText('lite cards')).toBeNull();
    });
});
