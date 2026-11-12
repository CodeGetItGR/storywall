import { describe, expect, it } from 'vitest';

import { canSaveScheduleDraft, EMPTY_SCHEDULE_DRAFT, scheduleItemToRequest, upsertScheduleItem } from '@/lib/provisionSchedule';

const draft = (title: string, isSecondary = false) => ({ ...EMPTY_SCHEDULE_DRAFT, title, isSecondary });

describe('provision schedule', () => {
    it('needs a title and an end after the start', () => {
        expect(canSaveScheduleDraft(draft(' '))).toBe(false);
        expect(canSaveScheduleDraft({ ...draft('Dinner'), startAt: '2030-06-01T20:00', endAt: '2030-06-01T19:00' })).toBe(false);
        expect(canSaveScheduleDraft({ ...draft('Dinner'), startAt: '2030-06-01T20:00', endAt: '2030-06-01T23:00' })).toBe(true);
    });

    it('adds, replaces, and keeps a single venue', () => {
        const added = upsertScheduleItem([draft('Church', true)], null, draft('Reception', true));
        expect(added.map((item) => [item.title, item.isSecondary])).toEqual([
            ['Church', false],
            ['Reception', true],
        ]);
        const replaced = upsertScheduleItem(added, 0, draft('Ceremony'));
        expect(replaced.map((item) => item.title)).toEqual(['Ceremony', 'Reception']);
        expect(replaced[1]?.isSecondary).toBe(true);
    });

    it('sends trimmed text, leaves blanks out, and drops the venue flag where the type has none', () => {
        const item = { ...draft(' Dinner ', true), locationName: '  ', mapsUrl: ' https://maps.example ' };
        expect(scheduleItemToRequest(item, true)).toEqual({
            title: 'Dinner',
            description: undefined,
            startAt: undefined,
            endAt: undefined,
            locationName: undefined,
            mapsUrl: 'https://maps.example',
            isSecondary: true,
        });
        expect(scheduleItemToRequest(item, false)).not.toHaveProperty('isSecondary');
    });
});
