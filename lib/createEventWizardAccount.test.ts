import { describe, expect, it } from 'vitest';

import { accountDestination, needsAccountStep, parseAccountView } from '@/lib/createEventWizardAccount';

describe('needsAccountStep', () => {
    it('is needed signed out and for a confirmed unverified email', () => {
        expect(needsAccountStep(null)).toBe(true);
        expect(needsAccountStep({ emailVerified: false, role: 'USER' })).toBe(true);
    });

    it('is not needed verified, or while the email state is still loading', () => {
        expect(needsAccountStep({ emailVerified: true, role: 'USER' })).toBe(false);
        expect(needsAccountStep({ emailVerified: null, role: 'USER' })).toBe(false);
    });
});

describe('accountDestination', () => {
    it('sends admins to their console, verified hosts to review, others to the code', () => {
        expect(accountDestination({ emailVerified: true, role: 'ADMIN' })).toBe('admin');
        expect(accountDestination({ emailVerified: true, role: 'USER' })).toBe('review');
        expect(accountDestination({ emailVerified: false, role: 'USER' })).toBe('code');
        expect(accountDestination({ emailVerified: null, role: 'USER' })).toBeNull();
        expect(accountDestination(null)).toBeNull();
    });
});

describe('parseAccountView', () => {
    it('reads the account screen from the URL', () => {
        expect(parseAccountView('signup')).toBe('signup');
        expect(parseAccountView('code')).toBe('code');
        expect(parseAccountView('nope')).toBe('choose');
        expect(parseAccountView(null)).toBe('choose');
    });
});
