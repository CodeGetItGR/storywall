import { track } from '@vercel/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { authEntry, flowErrorCode, type FlowEvent, inviteState, oauthMethod, trackFlow } from '@/lib/flowTracking';

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));

beforeEach(() => {
    vi.mocked(track).mockClear();
});

describe('trackFlow', () => {
    it('sends the name apart from its properties', () => {
        trackFlow({ name: 'Create Step', step: 'details', type: 'WEDDING' });

        expect(track).toHaveBeenCalledWith('Create Step', { step: 'details', type: 'WEDDING' });
    });

    it.each<FlowEvent>([
        { name: 'Auth Page', page: 'login', from: 'create' },
        { name: 'Sign Up Error', method: 'email', code: '3044' },
        { name: 'Checkout Open', from: 'wizard', plan: 'START' },
        { name: 'Invite Page', state: 'open', signedIn: false },
        { name: 'Verify Wall' },
    ])('keeps $name within the two properties Vercel stores', (event) => {
        trackFlow(event);

        expect(Object.keys(vi.mocked(track).mock.calls[0][1] ?? {}).length).toBeLessThanOrEqual(2);
    });
});

describe('authEntry', () => {
    it('names an invite first, then a create form link', () => {
        expect(authEntry('token', '/events/new?plan=START')).toBe('invite');
        expect(authEntry(null, '/events/new?plan=START')).toBe('create');
    });

    it('treats any other or unsafe return path as other', () => {
        expect(authEntry(null, null)).toBe('other');
        expect(authEntry(null, '/feed')).toBe('other');
        expect(authEntry(null, '//evil.example/events/new')).toBe('other');
    });
});

describe('oauthMethod', () => {
    it('names the provider', () => {
        expect(oauthMethod('GOOGLE')).toBe('google');
        expect(oauthMethod('APPLE')).toBe('apple');
    });
});

describe('flowErrorCode', () => {
    it('uses the API error code, and unknown for anything else', () => {
        const apiError = new ApiError(403, { errorCode: 3044 } as ConstructorParameters<typeof ApiError>[1]);

        expect(flowErrorCode(apiError)).toBe('3044');
        expect(flowErrorCode(new Error('network'))).toBe('unknown');
    });
});

describe('inviteState', () => {
    const open = { expired: false, alreadyUsed: false };

    it('matches the invite page terminal states', () => {
        expect(inviteState(undefined, false)).toBe('invalid');
        expect(inviteState(open, true)).toBe('invalid');
        expect(inviteState({ ...open, expired: true }, false)).toBe('expired');
        expect(inviteState({ ...open, alreadyUsed: true }, false)).toBe('used');
        expect(inviteState(open, false)).toBe('open');
    });

    it('keeps a used vendor link open', () => {
        expect(inviteState({ ...open, alreadyUsed: true, vendorType: 'PHOTOGRAPHER' }, false)).toBe('open');
    });
});
