import { cleanup, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { DateTimeField } from '@/components/ui/DateTimeField';
import messages from '@/messages/en.json';

function Harness({ requireBoth }: { requireBoth?: boolean }) {
    const [value, setValue] = useState('');
    return (
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <DateTimeField value={value} onChange={setValue} requireBoth={requireBoth} />
        </NextIntlClientProvider>
    );
}

function inputs(container: HTMLElement) {
    return {
        date: container.querySelector<HTMLInputElement>('input[type="date"]')!,
        time: container.querySelector<HTMLInputElement>('input[type="time"]')!,
    };
}

describe('DateTimeField requireBoth', () => {
    afterEach(cleanup);

    it('stays optional while both inputs are empty', () => {
        const { container } = render(<Harness requireBoth />);
        const { date, time } = inputs(container);

        expect(date).not.toBeRequired();
        expect(time).not.toBeRequired();
    });

    it('requires both inputs once one has a value', () => {
        const { container } = render(<Harness requireBoth />);
        const { date, time } = inputs(container);

        fireEvent.change(date, { target: { value: '2026-11-10' } });

        expect(date).toBeRequired();
        expect(time).toBeRequired();
        expect(time).toBeInvalid();
    });

    it('is optional again when the value is cleared', () => {
        const { container } = render(<Harness requireBoth />);
        const { date, time } = inputs(container);

        fireEvent.change(time, { target: { value: '10:00' } });
        fireEvent.change(time, { target: { value: '' } });

        expect(date).not.toBeRequired();
        expect(time).not.toBeRequired();
    });

    it('leaves a half-filled pair alone without the prop', () => {
        const { container } = render(<Harness />);
        const { date, time } = inputs(container);

        fireEvent.change(date, { target: { value: '2026-11-10' } });

        expect(date).not.toBeRequired();
        expect(time).not.toBeRequired();
    });
});
