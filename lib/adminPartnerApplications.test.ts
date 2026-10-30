import { describe, expect, it } from 'vitest';

import { applicationLinkHref, approveErrorKind, foundingCheckbox } from '@/lib/adminPartnerApplications';
import { ApiError } from '@/lib/api/client';

function conflict(errorCode: number, details?: Record<string, unknown>) {
    return new ApiError(409, { status: 409, errorCode, details });
}

describe('applicationLinkHref', () => {
    it('links a handle to Instagram', () => {
        expect(applicationLinkHref('@studio.m')).toBe('https://instagram.com/studio.m');
    });

    it('keeps an https URL', () => {
        expect(applicationLinkHref('https://studiom.gr')).toBe('https://studiom.gr');
    });
});

describe('foundingCheckbox', () => {
    it('is ticked while spots are left', () => {
        expect(foundingCheckbox(3)).toEqual({ defaultChecked: true, disabled: false });
    });

    it('is unticked and disabled at zero', () => {
        expect(foundingCheckbox(0)).toEqual({ defaultChecked: false, disabled: true });
    });

    it('is unticked and disabled while the count is unknown', () => {
        expect(foundingCheckbox(null)).toEqual({ defaultChecked: false, disabled: true });
    });
});

describe('approveErrorKind', () => {
    it('names each 409', () => {
        expect(approveErrorKind(conflict(5189))).toEqual({ kind: 'notPending' });
        expect(approveErrorKind(conflict(5190))).toEqual({ kind: 'foundingFull' });
        expect(approveErrorKind(conflict(5191, { collaboratorId: 'c-1' }))).toEqual({ kind: 'emailExists', collaboratorId: 'c-1' });
    });

    it('keeps an email clash without an id', () => {
        expect(approveErrorKind(conflict(5191))).toEqual({ kind: 'emailExists', collaboratorId: null });
    });

    it('falls back to other', () => {
        expect(approveErrorKind(new Error('boom'))).toEqual({ kind: 'other' });
        expect(approveErrorKind(null)).toBeNull();
    });
});
