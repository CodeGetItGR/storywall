import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useCallback, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColorCircles } from '@/components/ui/color/ColorCircles';
import en from '@/messages/en.json';

afterEach(cleanup);

function Circles({ start, onChange }: { start?: string; onChange: (color: string) => void }) {
    const [value, setValue] = useState(start);
    const pick = useCallback(
        (color: string) => {
            setValue(color);
            onChange(color);
        },
        [onChange],
    );

    return (
        <NextIntlClientProvider locale="en" messages={en}>
            <ColorCircles value={value} label="Colors" onChange={pick} />
        </NextIntlClientProvider>
    );
}

const more = en.InvitationEditor.moreColors;

describe('ColorCircles', () => {
    it('picks a circle and marks it', async () => {
        const onChange = vi.fn();
        render(<Circles onChange={onChange} />);
        expect(screen.getByRole('group', { name: 'Colors' })).toBeTruthy();
        await userEvent.click(screen.getByRole('button', { name: '#B5BFA6' }));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('#B5BFA6');
        expect(screen.getByRole('button', { name: '#B5BFA6' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('mixes any colour live, shows its code, and gives it its own circle', async () => {
        const onChange = vi.fn();
        render(<Circles start="#FF7A59" onChange={onChange} />);
        await userEvent.click(screen.getByRole('button', { name: more }));
        const hue = await screen.findByRole('slider', { name: 'Hue' });
        fireEvent.keyDown(hue, { key: 'ArrowRight', keyCode: 39, which: 39 });
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const mixed = onChange.mock.calls.at(-1)?.[0] as string;
        expect(mixed).toMatch(/^#[0-9A-F]{6}$/);
        expect(mixed).not.toBe('#FF7A59');
        expect(screen.getByText(mixed)).toBeTruthy();
        await userEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sectionSettings.done }));
        await waitFor(() => expect(screen.queryByRole('slider', { name: 'Hue' })).toBeNull());
        expect(screen.getByRole('button', { name: mixed }).getAttribute('aria-pressed')).toBe('true');
    });

    it('opens the mixer without picking; Done keeps the colour on show', async () => {
        const onChange = vi.fn();
        render(<Circles onChange={onChange} />);
        await userEvent.click(screen.getByRole('button', { name: more }));
        await screen.findByRole('slider', { name: 'Hue' });
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: en.InvitationEditor.sectionSettings.done }));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('#FF7A59');
    });
});
