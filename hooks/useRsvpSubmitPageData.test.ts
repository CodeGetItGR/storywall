import { describe, expect, it } from 'vitest';

import { computeShowConfirmation } from '@/hooks/useRsvpSubmitPageData';

// The full hook needs EventProvider/TanStack Query/router context to render,
// so this rule is pulled out as a plain function and tested on its own —
// see the plan review that asked for it.
describe('computeShowConfirmation', () => {
    it('shows the confirmation once submitted, regardless of any lingering error', () => {
        expect(computeShowConfirmation(true, false, true)).toBe(true);
        expect(computeShowConfirmation(true, false, false)).toBe(true);
    });

    it('shows the confirmation for an existing RSVP with no session-answers error', () => {
        expect(computeShowConfirmation(false, true, false)).toBe(true);
    });

    it('keeps the form up for a first-time RSVP whose session answers failed to save', () => {
        expect(computeShowConfirmation(false, true, true)).toBe(false);
    });

    it('opens the form, not the thanks screen, for a link to one session', () => {
        expect(computeShowConfirmation(false, true, false, true)).toBe(false);
        expect(computeShowConfirmation(false, true, false)).toBe(true);
        expect(computeShowConfirmation(true, true, false, true)).toBe(true);
    });

    it('keeps the form up when there is no RSVP yet', () => {
        expect(computeShowConfirmation(false, false, false)).toBe(false);
    });
});
