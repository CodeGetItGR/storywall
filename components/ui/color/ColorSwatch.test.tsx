import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColorCircles } from '@/components/ui/color/ColorCircles';
import { ColorSwatch } from '@/components/ui/color/ColorSwatch';
import en from '@/messages/en.json';

afterEach(cleanup);

const { moreColors, sectionSettings } = en.InvitationEditor;
const hue = () => screen.findByRole('slider', { name: 'Hue' });

function renderSwatch() {
    const onChange = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <ColorSwatch value="#336699" label="Main color" themeColors={['#123456']} onChange={onChange} />
        </NextIntlClientProvider>,
    );
    return onChange;
}

async function open() {
    await userEvent.click(screen.getByRole('button', { name: 'Main color' }));
    return screen.findByRole('dialog', { name: 'Main color' });
}

describe('ColorSwatch', () => {
    it("opens the theme's colours, the four and the one in use", async () => {
        renderSwatch();
        const names = within(await open())
            .getAllByRole('button')
            .map((button) => button.getAttribute('aria-label'));
        expect(names).toEqual(['#123456', '#FF7A59', '#B5BFA6', '#AC9FC7', '#CFB98C', '#336699', moreColors]);
    });

    it('closes once a circle is tapped', async () => {
        const onChange = renderSwatch();
        await userEvent.click(within(await open()).getByRole('button', { name: '#B5BFA6' }));
        expect(onChange).toHaveBeenCalledExactlyOnceWith('#B5BFA6');
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('changes live while mixing, and Done closes both', async () => {
        const onChange = renderSwatch();
        await userEvent.click(within(await open()).getByRole('button', { name: moreColors }));
        fireEvent.keyDown(await hue(), { key: 'ArrowRight', keyCode: 39, which: 39 });
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        await userEvent.click(screen.getByRole('button', { name: sectionSettings.done }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('goes back from the mixer to the circles on Escape', async () => {
        renderSwatch();
        await userEvent.click(within(await open()).getByRole('button', { name: moreColors }));
        await hue();
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(screen.queryByRole('slider', { name: 'Hue' })).toBeNull());
        expect(screen.getByRole('dialog', { name: 'Main color' })).toBeTruthy();
    });
});

describe('ColorCircles without live mixing', () => {
    it('changes the colour on Done only', async () => {
        const onChange = vi.fn();
        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <ColorCircles value="#FF7A59" label="Colors" liveMix={false} onChange={onChange} />
            </NextIntlClientProvider>,
        );
        await userEvent.click(screen.getByRole('button', { name: moreColors }));
        fireEvent.keyDown(await hue(), { key: 'ArrowRight', keyCode: 39, which: 39 });
        await waitFor(() => expect(screen.queryByText('#FF7A59')).toBeNull());
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole('button', { name: sectionSettings.done }));
        expect(onChange).toHaveBeenCalledOnce();
    });
});
