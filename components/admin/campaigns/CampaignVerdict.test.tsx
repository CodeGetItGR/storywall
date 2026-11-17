import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { CampaignVerdict } from '@/components/admin/campaigns/CampaignVerdict';
import type { Verdict } from '@/lib/campaignCompare';
import messages from '@/messages/en.json';

function renderVerdict(verdict: Verdict | null) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignVerdict verdict={verdict} />
        </NextIntlClientProvider>,
    );
}

describe('CampaignVerdict', () => {
    afterEach(cleanup);

    it.each<[Verdict, string]>([
        [{ kind: 'early' }, 'Too early to tell'],
        [{ kind: 'noSignUps' }, 'Many visits, no sign-ups'],
        [{ kind: 'better', measure: 'sales', multiple: 3 }, '3× more sales'],
        [{ kind: 'better', measure: 'signedUp', multiple: 1.5 }, '1.5× more sign-ups'],
        [{ kind: 'better', measure: 'sales', multiple: null }, 'More sales'],
        [{ kind: 'worse', measure: 'signedUp' }, 'Fewer sign-ups'],
        [{ kind: 'average', measure: 'sales' }, 'About average'],
    ])('says %o as "%s"', (verdict, text) => {
        renderVerdict(verdict);

        expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('colors a good verdict green and a bad one red', () => {
        renderVerdict({ kind: 'better', measure: 'sales', multiple: 2 });
        expect(screen.getByText('2× more sales').parentElement).toHaveClass('text-status-good');
        cleanup();

        renderVerdict({ kind: 'noSignUps' });
        expect(screen.getByText('Many visits, no sign-ups').parentElement).toHaveClass('text-status-danger');
    });

    it('shows a dash with nothing to compare with', () => {
        renderVerdict(null);

        expect(screen.getByText('—')).toBeInTheDocument();
    });
});
