import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    clearCreateEventWizardDraft,
    CREATE_WIZARD_DRAFT_KEY,
    CREATE_WIZARD_DRAFT_MAX_AGE_MS,
    type CreateEventWizardDraft,
    isCreateEventWizardDraftEmpty,
    readCreateEventWizardDraft,
    writeCreateEventWizardDraft,
} from '@/lib/createEventWizardDraft';

const DRAFT: CreateEventWizardDraft = {
    run: 'r1',
    step: 'details',
    eventType: 'BAPTISM',
    planCode: 'BASIC',
    durationPicks: { BASIC: 'opt-12' },
    title: 'Eleni',
    startAt: '2027-05-01T12:00',
    timezone: 'Europe/Athens',
    locationName: 'Agios Nikolaos',
    locationAddress: 'Athens',
    mapsUrl: '',
    themePresetId: null,
    gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } },
    checkoutCode: '',
    accountStepShown: false,
};

afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('createEventWizardDraft', () => {
    it('keeps whether the account step was shown', () => {
        writeCreateEventWizardDraft({ ...DRAFT, accountStepShown: true });
        expect(readCreateEventWizardDraft()?.accountStepShown).toBe(true);
        writeCreateEventWizardDraft({ ...DRAFT });
        expect(readCreateEventWizardDraft()?.accountStepShown).toBe(false);
    });

    it('reads back what it saved', () => {
        writeCreateEventWizardDraft(DRAFT);
        expect(readCreateEventWizardDraft()).toEqual(DRAFT);
    });

    it('forgets answers older than 7 days', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-01T10:00:00Z'));
        writeCreateEventWizardDraft(DRAFT);
        vi.setSystemTime(new Date(Date.parse('2026-11-01T10:00:00Z') + CREATE_WIZARD_DRAFT_MAX_AGE_MS + 1));
        expect(readCreateEventWizardDraft()).toBeNull();
    });

    it('ignores answers saved by another version', () => {
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, JSON.stringify({ ...DRAFT, version: 999, savedAt: Date.now() }));
        expect(readCreateEventWizardDraft()).toBeNull();
    });

    it('ignores broken or tampered values', () => {
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, '{not json');
        expect(readCreateEventWizardDraft()).toBeNull();
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), step: 'hack', title: 5 }));
        expect(readCreateEventWizardDraft()).toMatchObject({ step: 'type', title: '' });
    });

    it('works when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(() => writeCreateEventWizardDraft(DRAFT)).not.toThrow();
        expect(readCreateEventWizardDraft()).toBeNull();
        expect(() => clearCreateEventWizardDraft()).not.toThrow();
    });

    it('clears', () => {
        writeCreateEventWizardDraft(DRAFT);
        clearCreateEventWizardDraft();
        expect(readCreateEventWizardDraft()).toBeNull();
    });

    it('tells a draft with nothing typed from one with answers', () => {
        expect(isCreateEventWizardDraftEmpty({ ...DRAFT, title: '', startAt: '', locationName: '', locationAddress: '' })).toBe(true);
        expect(isCreateEventWizardDraftEmpty(DRAFT)).toBe(false);
    });
});
