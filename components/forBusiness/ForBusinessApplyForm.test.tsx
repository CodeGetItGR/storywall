import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { ForBusinessApplyForm } from '@/components/forBusiness/ForBusinessApplyForm';
import messages from '@/messages/en.json';

const COUNTRIES = [
    { code: 'GR', name: 'Greece' },
    { code: 'CY', name: 'Cyprus' },
];

const DEFAULTS = { name: 'Maria', businessName: 'Lens and Light', role: 'PHOTOGRAPHER', email: 'maria@example.com', link: '' };

function renderIntl(ui: ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

function formValues() {
    const form = document.querySelector('form');
    if (!form) throw new Error('no form');
    return Object.fromEntries(new FormData(form).entries());
}

afterEach(cleanup);

describe('ForBusinessApplyForm', () => {
    it('shows every field when nothing is filled in', () => {
        renderIntl(<ForBusinessApplyForm countries={COUNTRIES} defaultCountry="GR" />);

        expect(screen.getByLabelText('Your name')).toBeInTheDocument();
        expect(screen.getByLabelText('Business name')).toBeInTheDocument();
        expect(screen.getByLabelText('What you do')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Website or Instagram')).toBeInTheDocument();
        expect(screen.getByLabelText('Country')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
    });

    it('collapses filled fields into a summary and still sends them', () => {
        renderIntl(<ForBusinessApplyForm countries={COUNTRIES} defaultCountry="GR" defaults={DEFAULTS} />);

        expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('What you do')).not.toBeInTheDocument();
        expect(screen.getByText('Maria')).toBeInTheDocument();
        expect(screen.getByText('Photographer')).toBeInTheDocument();
        // The blank link stays a field to fill in.
        expect(screen.getByLabelText('Website or Instagram')).toBeInTheDocument();
        expect(formValues()).toMatchObject({ name: 'Maria', businessName: 'Lens and Light', role: 'PHOTOGRAPHER', email: 'maria@example.com' });
    });

    it('turns the summary back into fields on Edit details', () => {
        renderIntl(<ForBusinessApplyForm countries={COUNTRIES} defaultCountry="GR" defaults={DEFAULTS} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));

        expect(screen.getByLabelText('Your name')).toHaveValue('Maria');
        expect(screen.getByLabelText('What you do')).toHaveValue('PHOTOGRAPHER');
        expect(screen.queryByRole('button', { name: 'Edit details' })).not.toBeInTheDocument();
    });
});
