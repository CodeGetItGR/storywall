import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DurationPicker } from '@/components/plan/DurationPicker';

const messages = {
    Durations: {
        label: 'Duration',
        short: '{count}m',
        months: '{count, plural, one {# month} other {# months}}',
    },
};

const options = [
    { id: 'd6', months: 6 },
    { id: 'd9', months: 9 },
];

function renderPicker(labelledBy?: string) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <p id="duration-label">Online after your event</p>
            <DurationPicker options={options} value="d6" onChangeAction={vi.fn()} labelledBy={labelledBy} />
        </NextIntlClientProvider>,
    );
}

afterEach(cleanup);

describe('DurationPicker', () => {
    it('is named by the visible label it is linked to', () => {
        renderPicker('duration-label');
        expect(screen.getByRole('radiogroup', { name: 'Online after your event' })).toBeInTheDocument();
    });

    it('falls back to the generic label when none is linked', () => {
        renderPicker();
        expect(screen.getByRole('radiogroup', { name: 'Duration' })).toBeInTheDocument();
    });

    it('shows a disabled option but does not pick it', () => {
        const onChange = vi.fn();
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <DurationPicker options={options} value="d9" onChangeAction={onChange} disabledOptionIds={['d6']} />
            </NextIntlClientProvider>,
        );

        const disabledOption = screen.getByRole('radio', { name: '6 months' });
        expect(disabledOption).toBeDisabled();
        fireEvent.click(disabledOption);
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('radio', { name: '9 months' })).toBeEnabled();
    });
});
