import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { RsvpHeadlineTiles } from '@/components/manage/rsvp/RsvpHeadlineTiles';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.ManagePage.rsvpStats;
const totals = { responses: 96, people: 168, adults: 142, children: 26 };

function renderTiles(props: Parameters<typeof RsvpHeadlineTiles>[0]) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <RsvpHeadlineTiles {...props} />
        </NextIntlClientProvider>,
    );
}

describe('RsvpHeadlineTiles', () => {
    it('shows the four numbers with today’s labels', () => {
        renderTiles({ totals, isLoading: false });
        for (const [label, value] of [
            [t.responses, '96'],
            [t.totalPeople, '168'],
            [t.adults, '142'],
            [t.kids, '26'],
        ]) {
            expect(screen.getByText(label).nextElementSibling?.textContent).toBe(value);
        }
    });

    it('shows a skeleton while loading', () => {
        const { container } = renderTiles({ totals: null, isLoading: true });
        expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    });

    it('shows nothing without numbers', () => {
        const { container } = renderTiles({ totals: null, isLoading: false });
        expect(container).toBeEmptyDOMElement();
    });
});
