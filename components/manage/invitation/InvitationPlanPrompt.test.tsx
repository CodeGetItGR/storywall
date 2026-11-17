import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { InvitationPlanPrompt } from '@/components/manage/invitation/InvitationPlanPrompt';
import messages from '@/messages/en.json';

const PLAN_HREF = '/events/evt-1/manage?tab=plan';

function renderPrompt(addOnHref: string | null, addOnPrice: string | null = null) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <InvitationPlanPrompt invitation={{ planHref: PLAN_HREF, addOnHref, addOnPrice }} />
        </NextIntlClientProvider>,
    );
}

describe('InvitationPlanPrompt', () => {
    afterEach(cleanup);

    it('offers only the upgrade when no add-on is sold', () => {
        renderPrompt(null);

        expect(screen.getByText(messages.ManagePage.invitation.upgradeBody)).toBeTruthy();
        expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([PLAN_HREF]);
    });

    it('leads with the add-on and keeps the upgrade second when one is sold', () => {
        renderPrompt('/events/evt-1/settings/addons?add=SAVE_MY_DATE', '€29.00');

        expect(screen.getByText(messages.ManagePage.invitation.addOnBody)).toBeTruthy();
        const links = screen.getAllByRole('link');
        expect(links.map((link) => link.textContent)).toEqual(['Add the invitation · €29.00', 'Upgrade plan']);
        expect(links[0]?.getAttribute('href')).toBe('/events/evt-1/settings/addons?add=SAVE_MY_DATE');
    });
});
