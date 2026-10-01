import { describe, expect, it } from 'vitest';

import { canDeleteContent, canReportContent, isContentLocked } from '@/lib/contentPermissions';

describe('canDeleteContent', () => {
    const base = { isMember: true, isAuthor: false, isHost: false, canWrite: true };

    it('lets the author delete their own content', () => {
        expect(canDeleteContent({ ...base, isAuthor: true })).toBe(true);
    });

    it("lets a host delete another member's content", () => {
        expect(canDeleteContent({ ...base, isHost: true })).toBe(true);
    });

    it("does not let a guest delete another member's content", () => {
        expect(canDeleteContent(base)).toBe(false);
    });

    it('allows nothing once the event is not writable', () => {
        expect(canDeleteContent({ ...base, isAuthor: true, isHost: true, canWrite: false })).toBe(false);
    });

    it('allows nothing without a membership', () => {
        expect(canDeleteContent({ ...base, isMember: false, isHost: true })).toBe(false);
    });
});

describe('canReportContent', () => {
    const base = { isMember: true, isAuthor: false, canWrite: true, targetTypeReportable: true };

    it("lets a member report someone else's content, including a host's", () => {
        expect(canReportContent(base)).toBe(true);
    });

    it('does not let the author report their own content', () => {
        expect(canReportContent({ ...base, isAuthor: true })).toBe(false);
    });

    it('lets a member report content that has no author on record', () => {
        expect(
            canReportContent({ isMember: true, isAuthor: false, canWrite: true, targetTypeReportable: true }),
        ).toBe(true);
    });

    it('never lets the author report their own content', () => {
        expect(
            canReportContent({ isMember: true, isAuthor: true, canWrite: true, targetTypeReportable: true }),
        ).toBe(false);
    });

    it('does not offer a report the platform does not accept', () => {
        expect(canReportContent({ ...base, targetTypeReportable: false })).toBe(false);
    });

    it('does not offer a report once the event is not writable', () => {
        expect(canReportContent({ ...base, canWrite: false })).toBe(false);
    });
});

describe('isContentLocked', () => {
    it('locks the content that came with the public demo', () => {
        expect(isContentLocked('demoVisitor', '3f1c2a9e-0000-4000-8000-000000000001')).toBe(true);
    });

    it('leaves what the visitor added in the public demo open', () => {
        expect(isContentLocked('demoVisitor', 'demo-post-1727000000000-1')).toBe(false);
    });

    it('never locks content outside the public demo', () => {
        expect(isContentLocked('standard', '3f1c2a9e-0000-4000-8000-000000000001')).toBe(false);
        expect(isContentLocked('demoBuilder', '3f1c2a9e-0000-4000-8000-000000000001')).toBe(false);
    });
});
