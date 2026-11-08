import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { DRAFT_REVISION_STALE_ERROR_CODE, isStaleRevision, isTransientSaveError, readEditableDraft, sameDocument } from '@/lib/invitation/drafts';
import { sampleDraftDocument, sampleDraftDto as draftDto } from '@/lib/invitation/sampleDraft';
import { PREVIEW_THEME } from '@/lib/saveMyDatePreview';

describe('readEditableDraft', () => {
    it('checks the document and theme and resolves images from the draft', () => {
        const draft = readEditableDraft(draftDto());
        expect(draft).toMatchObject({ id: 'draft-1', revision: 4, document: sampleDraftDocument(), theme: PREVIEW_THEME });
        expect(draft.media('m-top')).toBe('/images/venue.png');
        expect(draft.media('unknown')).toBeUndefined();
    });

    it('throws when the document is not in the format', () => {
        expect(() => readEditableDraft({ ...draftDto(), document: { schemaVersion: 1, sections: 'nope' } })).toThrow();
    });

    it('throws when the theme is not in the format', () => {
        expect(() => readEditableDraft(draftDto({ design: { colors: {} } }))).toThrow();
    });
});

describe('isStaleRevision', () => {
    it('is the 409 with the stale revision code only', () => {
        expect(isStaleRevision(new ApiError(409, { errorCode: DRAFT_REVISION_STALE_ERROR_CODE }))).toBe(true);
        expect(isStaleRevision(new ApiError(409, { errorCode: 5212 }))).toBe(false);
        expect(isStaleRevision(new ApiError(400, { errorCode: DRAFT_REVISION_STALE_ERROR_CODE }))).toBe(false);
        expect(isStaleRevision(new Error('offline'))).toBe(false);
    });
});

describe('isTransientSaveError', () => {
    it('retries no answer, busy and server errors, not a refused save', () => {
        expect(isTransientSaveError(new TypeError('Failed to fetch'))).toBe(true);
        expect(isTransientSaveError(new ApiError(503, null))).toBe(true);
        expect(isTransientSaveError(new ApiError(429, null))).toBe(true);
        expect(isTransientSaveError(new ApiError(400, null))).toBe(false);
        expect(isTransientSaveError(new ApiError(404, null))).toBe(false);
    });
});

describe('sameDocument', () => {
    it('ignores the order of keys', () => {
        expect(sameDocument({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    });

    it('notices a changed value', () => {
        expect(sameDocument({ a: 1 }, { a: 2 })).toBe(false);
        expect(sameDocument(sampleDraftDocument(), { ...sampleDraftDocument(), overrides: { textColor: '#000000' } })).toBe(false);
    });
});
