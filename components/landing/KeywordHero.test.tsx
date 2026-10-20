import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KeywordHero } from '@/components/landing/KeywordHero';

describe('KeywordHero', () => {
    afterEach(() => {
        cleanup();
    });

    it('makes the keyword the only h1 and names the section after it', () => {
        render(
            <KeywordHero
                actions={<a href="#create">Create</a>}
                h1="Wedding QR code"
                header={<nav>Header</nav>}
                headline={
                    <>
                        One QR code. <strong>Every photo.</strong>
                    </>
                }
                lead="Guests scan and upload."
                note="Included in every plan."
                visual={<div>Phone</div>}
            />,
        );

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('region', { name: 'Wedding QR code' })).toBeInTheDocument();
        expect(screen.getByText('Included in every plan.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '#create');
        expect(screen.getByText('Phone')).toBeInTheDocument();
    });
});
