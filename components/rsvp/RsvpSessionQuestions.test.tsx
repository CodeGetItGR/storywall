import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RsvpSessionQuestions } from '@/components/rsvp/RsvpSessionQuestions';
import en from '@/messages/en.json';

const params = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => params.value }));

const scroll = vi.fn();
const original = Element.prototype.scrollIntoView;

beforeEach(() => {
    Element.prototype.scrollIntoView = scroll;
});

afterEach(() => {
    cleanup();
    scroll.mockReset();
    Element.prototype.scrollIntoView = original;
});

function renderQuestions(query: string) {
    params.value = new URLSearchParams(query);
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <RsvpSessionQuestions
                questions={[
                    { id: 'church', title: 'Church', when: null, answer: null },
                    { id: 'party', title: 'Party', when: null, answer: null },
                ]}
                onAnswerAction={vi.fn()}
            />
        </NextIntlClientProvider>,
    );
}

describe('RsvpSessionQuestions', () => {
    it('scrolls to the session a link asked about', () => {
        renderQuestions('session=party');
        expect(document.getElementById('rsvp-session-party')?.className).toContain('ring-2');
        expect(document.getElementById('rsvp-session-church')?.className).not.toContain('ring-2');
        expect(scroll).toHaveBeenCalledOnce();
        expect(scroll.mock.contexts[0]).toBe(document.getElementById('rsvp-session-party'));
    });

    it('stays where it is without one', () => {
        renderQuestions('');
        expect(document.querySelector('.ring-2')).toBeNull();
        expect(scroll).not.toHaveBeenCalled();
    });
});
