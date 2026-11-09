import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { rsvpOutcome, type RsvpOutcomeCopy } from '@/lib/invitation/rsvpOutcome';

const copy: RsvpOutcomeCopy = {
    phoneInvalid: 'phone invalid',
    closed: 'closed',
    failed: 'failed',
    rateLimited: (seconds) => `wait ${seconds ?? '?'}`,
};

const problem = (status: number, errorCode?: number, extra: Record<string, unknown> = {}) =>
    new ApiError(status, { type: 'about:blank', title: 'x', status, detail: '', instance: '/', errorCode, errorKey: 'x', ...extra });

const DEADLINE_MESSAGE = 'Replies for this event closed on the RSVP deadline.';
const REPLIES_FULL_MESSAGE = "This event can't take more replies through its invitation. Please contact the hosts.";

describe('rsvpOutcome', () => {
    it('is saved when the backend answers with no error (204, a duplicate or the honeypot alike)', () => {
        expect(rsvpOutcome(null, copy)).toEqual({ ok: true });
    });

    it('reloads the page for an unknown (404) or offline (410, 5221) invitation', () => {
        expect(rsvpOutcome(problem(404, 2001), copy)).toEqual({ ok: false, reload: true });
        expect(rsvpOutcome(problem(410, 5221), copy)).toEqual({ ok: false, reload: true });
    });

    it('shows the approved backend message once the RSVP deadline has passed (409, 5222)', () => {
        expect(rsvpOutcome(problem(409, 5222, { detail: DEADLINE_MESSAGE }), copy)).toEqual({ ok: false, message: DEADLINE_MESSAGE });
        expect(rsvpOutcome(problem(409, 5222), copy)).toEqual({ ok: false, message: 'closed' });
    });

    it('shows the approved backend message once the event holds its cap of invitation replies (409, 5223)', () => {
        expect(rsvpOutcome(problem(409, 5223, { detail: REPLIES_FULL_MESSAGE }), copy)).toEqual({ ok: false, message: REPLIES_FULL_MESSAGE });
        expect(rsvpOutcome(problem(409, 5223), copy)).toEqual({ ok: false, message: 'closed' });
    });

    it('says replies are closed when the plan has no RSVP or the host switched it off (409, 5012)', () => {
        expect(rsvpOutcome(problem(409, 5012, { detail: 'Module not available' }), copy)).toEqual({ ok: false, message: 'closed' });
    });

    it('asks to wait for the time the rate limit gives (429, 3010)', () => {
        expect(rsvpOutcome(problem(429, 3010, { retryAfterSeconds: 1800 }), copy)).toEqual({ ok: false, message: 'wait 1800' });
        expect(rsvpOutcome(new ApiError(429, null, undefined, '120'), copy)).toEqual({ ok: false, message: 'wait 120' });
    });

    it('points at the phone when the backend refuses it, and fails generally for any other 400', () => {
        expect(rsvpOutcome(problem(400, 3001, { errors: { phone: 'bad' } }), copy)).toEqual({ ok: false, message: 'phone invalid' });
        expect(rsvpOutcome(problem(400, 3001, { errors: { email: 'bad' } }), copy)).toEqual({ ok: false, message: 'failed' });
    });

    it('fails generally for anything else', () => {
        expect(rsvpOutcome(problem(500, 9001), copy)).toEqual({ ok: false, message: 'failed' });
        expect(rsvpOutcome(new ApiError(502, null), copy)).toEqual({ ok: false, message: 'failed' });
    });
});
