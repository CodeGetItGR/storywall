import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AcceptanceCheckboxes } from '@/components/legal/AcceptanceCheckboxes';
import messages from '@/messages/en.json';

function renderBoxes(props: Partial<ComponentProps<typeof AcceptanceCheckboxes>> = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <AcceptanceCheckboxes
                accepted={false}
                adultConfirmed={false}
                onAcceptedChangeAction={vi.fn()}
                onAdultConfirmedChangeAction={vi.fn()}
                {...props}
            />
        </NextIntlClientProvider>,
    );
}

describe('AcceptanceCheckboxes', () => {
    afterEach(cleanup);

    it('has two required boxes that report changes separately', () => {
        const onAccepted = vi.fn();
        const onAdult = vi.fn();
        renderBoxes({ onAcceptedChangeAction: onAccepted, onAdultConfirmedChangeAction: onAdult });

        const [documents, adult] = screen.getAllByRole('checkbox');
        expect(documents).toBeRequired();
        expect(adult).toBeRequired();
        fireEvent.click(adult);
        expect(onAdult).toHaveBeenCalledTimes(1);
        expect(onAccepted).not.toHaveBeenCalled();
        fireEvent.click(documents);
        expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it('links all three documents in a new tab, and says so to screen readers', () => {
        renderBoxes();

        const terms = screen.getByRole('link', { name: 'Terms of Use (opens in a new tab)' });
        expect(terms).toHaveAttribute('href', '/legal/terms');
        expect(terms).toHaveAttribute('target', '_blank');
        expect(screen.getByRole('link', { name: 'Community Guidelines (opens in a new tab)' })).toHaveAttribute(
            'href',
            '/legal/community-guidelines',
        );
        expect(screen.getByRole('link', { name: 'Privacy Policy (opens in a new tab)' })).toHaveAttribute('href', '/legal/privacy');
        expect(screen.getByLabelText('I am 18 or older')).toBeInTheDocument();
    });

    it('leaves the Community Guidelines out when only the Terms are owed', () => {
        renderBoxes({ documents: 'terms' });

        expect(screen.getByRole('link', { name: 'Terms of Use (opens in a new tab)' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Privacy Policy (opens in a new tab)' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Community Guidelines/ })).not.toBeInTheDocument();
    });
});
