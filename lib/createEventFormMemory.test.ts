import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSavedCreateEventForm, readSavedCreateEventForm, saveCreateEventForm, type SavedCreateEventForm } from '@/lib/createEventFormMemory';

const form: SavedCreateEventForm = {
    eventType: 'WEDDING',
    selectedPlanCode: 'PLUS',
    durationPicks: { PLUS: 'option-1' },
    title: 'Anna and Nick',
    startAt: '2027-06-01T18:00',
    timezone: 'Europe/Athens',
    locationName: 'Venue',
    locationAddress: 'Street 1',
    mapsUrl: '',
    themePresetId: null,
    checkoutCode: '',
    draftEventId: null,
    draftSelection: null,
    gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } },
};

afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
});

describe('create event form memory', () => {
    it('reads back what was saved for that run only', () => {
        saveCreateEventForm('run-1', form);

        expect(readSavedCreateEventForm('run-1')).toEqual(form);
        expect(readSavedCreateEventForm('run-2')).toBeNull();
        expect(readSavedCreateEventForm(null)).toBeNull();
    });

    it('forgets a cleared run', () => {
        saveCreateEventForm('run-1', form);
        clearSavedCreateEventForm('run-1');

        expect(readSavedCreateEventForm('run-1')).toBeNull();
    });

    it('ignores a broken or older saved value', () => {
        window.sessionStorage.setItem('storywall.createEventForm.broken', '{not json');
        window.sessionStorage.setItem('storywall.createEventForm.old', JSON.stringify({ version: 0, form }));

        expect(readSavedCreateEventForm('broken')).toBeNull();
        expect(readSavedCreateEventForm('old')).toBeNull();
    });

    it('carries on when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });

        expect(() => saveCreateEventForm('run-1', form)).not.toThrow();
        expect(readSavedCreateEventForm('run-1')).toBeNull();
    });
});
