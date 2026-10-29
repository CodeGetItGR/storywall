import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SignupAcceptanceCheckbox } from '@/components/legal/SignupAcceptanceCheckbox';
import messages from '@/messages/en.json';

function renderBox(onChange = vi.fn()) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <SignupAcceptanceCheckbox checked={false} onChangeAction={onChange} />
        </NextIntlClientProvider>,
    );
}

describe('SignupAcceptanceCheckbox', () => {
    afterEach(cleanup);

    it('is one required box for the documents and the 18+ confirmation', () => {
        const onChange = vi.fn();
        renderBox(onChange);

        const box = screen.getByRole('checkbox', { name: /18 or older/ });
        expect(box).toBeRequired();
        fireEvent.click(box);
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('links all three documents in a new tab', () => {
        renderBox();

        expect(screen.getByRole('link', { name: 'Terms of Use (opens in a new tab)' })).toHaveAttribute('target', '_blank');
        expect(screen.getByRole('link', { name: 'Community Guidelines (opens in a new tab)' })).toHaveAttribute('href', '/legal/community-guidelines');
        expect(screen.getByRole('link', { name: 'Privacy Policy (opens in a new tab)' })).toHaveAttribute('href', '/legal/privacy');
    });
});
