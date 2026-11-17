import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RsvpFilterChips } from '@/components/manage/rsvp/RsvpFilterChips';
import messages from '@/messages/en.json';

afterEach(cleanup);

const t = messages.ManagePage;
const counts = { ATTENDING: 84, DECLINED: 12, NO_RESPONSE: 14 };

describe('RsvpFilterChips', () => {
    it('shows each filter with its count and marks the active one', () => {
        const onChange = vi.fn();
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <RsvpFilterChips filter="all" counts={counts} guestCount={110} onChangeAction={onChange} />
            </NextIntlClientProvider>,
        );

        expect(screen.getByRole('button', { name: `${t.rsvpFilters.all} 110` }).getAttribute('aria-pressed')).toBe('true');
        const declined = screen.getByRole('button', { name: `${t.rsvpBreakdown.declined} 12` });
        expect(declined.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(declined);
        expect(onChange).toHaveBeenCalledWith('DECLINED');
    });
});
