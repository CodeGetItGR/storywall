import { describe, expect, it } from 'vitest';

import { canDeleteContent, canReportContent } from '@/lib/contentPermissions';

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
    const base = { isMember: true, isAuthor: false, targetTypeReportable: true };

    it("lets a member report someone else's content, including a host's", () => {
        expect(canReportContent(base)).toBe(true);
    });

    it('does not let the author report their own content', () => {
        expect(canReportContent({ ...base, isAuthor: true })).toBe(false);
    });

    it('lets a member report content that has no author on record', () => {
        expect(
            canReportContent({ isMember: true, isAuthor: false, targetTypeReportable: true }),
        ).toBe(true);
    });

    it('never lets the author report their own content', () => {
        expect(
            canReportContent({ isMember: true, isAuthor: true, targetTypeReportable: true }),
        ).toBe(false);
    });

    it('does not offer a report the platform does not accept', () => {
        expect(canReportContent({ ...base, targetTypeReportable: false })).toBe(false);
    });

    it('does not depend on the event being writable: content that is visible can be reported', () => {
        expect(canReportContent(base)).toBe(true);
    });
});
