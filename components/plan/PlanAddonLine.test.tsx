import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { storySaveMyDateAddon } from '@/.storybook/featureAddons';
import { PlanAddonLine } from '@/components/plan/PlanAddonLine';
import messages from '@/messages/el.json';
import enMessages from '@/messages/en.json';

describe('PlanAddonLine', () => {
    afterEach(cleanup);

    it("shows the add-on's name and price", () => {
        render(
            <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
                <PlanAddonLine service={storySaveMyDateAddon} />
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('+ Online invitation · €29.00')).toBeTruthy();
    });

    it('formats the price for the Greek page', () => {
        render(
            <NextIntlClientProvider locale="el" messages={messages} timeZone="UTC">
                <PlanAddonLine service={storySaveMyDateAddon} />
            </NextIntlClientProvider>,
        );

        expect(screen.getByText(/^\+ Online invitation · 29,00\s€$/)).toBeTruthy();
    });
});
