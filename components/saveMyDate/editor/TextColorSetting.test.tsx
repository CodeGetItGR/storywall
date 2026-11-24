import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TextColorSetting } from '@/components/saveMyDate/editor/TextColorSetting';
import en from '@/messages/en.json';

function renderSetting(value: string) {
    const onChange = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <TextColorSetting value={value} themeColors={['#336699']} onChange={onChange} />
        </NextIntlClientProvider>,
    );
    return { onChange, circles: within(screen.getByRole('group', { name: 'Text color' })) };
}

describe('TextColorSetting', () => {
    afterEach(cleanup);

    it('shows the colour and reports a new one', () => {
        const { onChange, circles } = renderSetting('#336699');
        expect(circles.getByRole('button', { name: '#336699' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(circles.getByRole('button', { name: '#AC9FC7' }));
        expect(onChange).toHaveBeenCalledWith('#AC9FC7');
    });

    it('shows a short colour in full', () => {
        const { circles } = renderSetting('#abc');
        expect(circles.getByRole('button', { name: '#AABBCC' })).toHaveAttribute('aria-pressed', 'true');
    });
});
