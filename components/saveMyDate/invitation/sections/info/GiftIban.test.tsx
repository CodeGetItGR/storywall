import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GiftCopyButton } from '@/components/saveMyDate/invitation/sections/info/GiftIban';

afterEach(cleanup);

describe('GiftCopyButton', () => {
    it('copies the IBAN and says so', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });
        render(<GiftCopyButton iban="GR00 0000" copyLabel="Copy" copiedLabel="Copied" />);

        fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

        expect(await screen.findByText('Copied')).toBeTruthy();
        expect(writeText).toHaveBeenCalledWith('GR00 0000');
    });
});
