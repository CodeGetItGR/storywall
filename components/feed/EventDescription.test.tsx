import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EventDescription } from '@/components/feed/EventDescription';
import { eventDescriptionViewsKey } from '@/lib/storageKeys';

const KEY = eventDescriptionViewsKey('e-1');

function section() {
    return screen.getByText('Hello').closest('section') as HTMLElement;
}

describe('EventDescription', () => {
    beforeEach(() => window.localStorage.removeItem(KEY));
    afterEach(cleanup);

    it('shows and counts a view', () => {
        render(<EventDescription eventId="e-1" description="Hello" />);
        expect(section().hidden).toBe(false);
        expect(window.localStorage.getItem(KEY)).toBe('1');
    });

    it('hides itself after two views', () => {
        window.localStorage.setItem(KEY, '2');
        render(<EventDescription eventId="e-1" description="Hello" />);
        expect(section().hidden).toBe(true);
    });

    it('always shows inside a fold and counts no views', () => {
        window.localStorage.setItem(KEY, '2');
        render(<EventDescription eventId="e-1" description="Hello" keepShown />);
        expect(section().hidden).toBe(false);
        expect(section().classList.contains('invisible')).toBe(false);
        expect(window.localStorage.getItem(KEY)).toBe('2');
    });
});
