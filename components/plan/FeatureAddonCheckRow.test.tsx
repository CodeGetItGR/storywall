import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyRsvpAddon, storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { FeatureAddonCheckRow } from '@/components/plan/FeatureAddonCheckRow';
import messages from '@/messages/en.json';

function renderWithIntl(node: React.ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {node}
        </NextIntlClientProvider>,
    );
}

describe('FeatureAddonCheckRow', () => {
    afterEach(cleanup);

    it('shows an always-included add-on ticked and locked', () => {
        renderWithIntl(<FeatureAddonCheckRow service={storySaveMyDateAddon} checked={false} />);
        const box = screen.getByRole('checkbox', { name: /Online invitation.*€29\.00 once/ }) as HTMLInputElement;

        expect(box.checked).toBe(true);
        expect(box.disabled).toBe(true);
    });

    it('lets the host tick a tickable add-on', () => {
        const onChange = vi.fn();
        renderWithIntl(<FeatureAddonCheckRow service={storyRsvpAddon} checked={false} onChange={onChange} />);
        const box = screen.getByRole('checkbox', { name: /RSVP.*€9\.00 once/ }) as HTMLInputElement;

        expect(box.disabled).toBe(false);
        fireEvent.click(box);
        expect(onChange).toHaveBeenCalledOnce();
    });

    it('locks a tickable add-on while paying', () => {
        renderWithIntl(<FeatureAddonCheckRow service={storyRsvpAddon} checked onChange={vi.fn()} disabled />);

        expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    });
});
