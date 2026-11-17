import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';
import en from '@/messages/en.json';

function renderSetting(value: string) {
    const onChange = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <TextColorSetting value={value} onChange={onChange} />
        </NextIntlClientProvider>,
    );
    return { onChange, input: screen.getByLabelText('Text color') };
}

describe('TextColorSetting', () => {
    afterEach(cleanup);

    it('shows the colour and reports a new one', () => {
        const { onChange, input } = renderSetting('#336699');
        expect(input).toHaveValue('#336699');

        fireEvent.change(input, { target: { value: '#112233' } });
        expect(onChange).toHaveBeenCalledWith('#112233');
    });

    it('shows a short colour in full', () => {
        const { input } = renderSetting('#abc');
        expect(input).toHaveValue('#aabbcc');
    });
});
