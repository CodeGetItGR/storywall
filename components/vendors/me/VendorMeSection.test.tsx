import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';

describe('VendorMeSection', () => {
    afterEach(cleanup);

    it('renders the icon next to the title when given', () => {
        render(<VendorMeSection id="s" title="Title" icon={<span data-testid="icon" />} />);

        expect(screen.getByTestId('icon')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Title' })).toBeTruthy();
    });

    it('renders without an icon', () => {
        render(<VendorMeSection id="s" title="Title" hint="Hint" />);

        expect(screen.queryByTestId('icon')).toBeNull();
        expect(screen.getByText('Hint')).toBeTruthy();
    });
});
