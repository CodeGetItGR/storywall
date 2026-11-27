import { describe, expect, it } from 'vitest';

import type { EventSessionResponseDto } from '@/lib/api/types';
import { getManagedSessionDefinitions, getScheduleSuggestions, scheduleEditRows } from '@/lib/sessionManagement';

const session = (id: string, flags: Partial<Pick<EventSessionResponseDto, 'isMain' | 'isSecondary'>> = {}) =>
    ({ id, isMain: false, isSecondary: false, ...flags }) as EventSessionResponseDto;

const roles = (rows: ReturnType<typeof scheduleEditRows>) => rows.map((row) => row.definition?.role ?? row.session?.id);

describe('scheduleEditRows', () => {
    it('gives a graduation Ceremony and Dinner slots titled with its own words, and says "Not added yet"', () => {
        const [main, secondary] = getManagedSessionDefinitions('GRADUATION');
        expect(main).toMatchObject({ role: 'main', defaultTitleKey: 'initialSessions.GRADUATION.title', missingKey: 'notAdded' });
        expect(secondary).toMatchObject({ role: 'secondary', defaultTitleKey: 'secondarySessions.GRADUATION.title', missingKey: 'notAdded' });
    });

    it('suggests a party while a graduation has nothing but its ceremony and dinner', () => {
        expect(roles(scheduleEditRows('GRADUATION', [session('c', { isMain: true })]))).toEqual(['main', 'secondary', 'suggestion']);
        expect(roles(scheduleEditRows('GRADUATION', [session('c', { isMain: true }), session('d', { isSecondary: true })]))).toEqual([
            'main',
            'secondary',
            'suggestion',
        ]);
        const [party] = getScheduleSuggestions('GRADUATION');
        expect(party).toMatchObject({
            role: 'suggestion',
            sectionId: 'party-session',
            defaultTitleKey: 'suggestedSessions.GRADUATION.title',
            missingKey: 'notAdded',
        });
    });

    it('drops the suggestion once a graduation has any other item', () => {
        expect(roles(scheduleEditRows('GRADUATION', [session('c', { isMain: true }), session('p')]))).toEqual(['main', 'secondary', 'p']);
    });

    it('leaves weddings, baptisms and other types as they were', () => {
        expect(roles(scheduleEditRows('WEDDING', [session('c', { isMain: true }), session('x')]))).toEqual(['main', 'secondary', 'x']);
        expect(getManagedSessionDefinitions('WEDDING').map((definition) => definition.missingKey)).toEqual(['mainMissing', 'missing']);
        expect(getManagedSessionDefinitions('BAPTISM').map((definition) => definition.missingKey)).toEqual(['mainMissing', 'missing']);
        expect(getScheduleSuggestions('WEDDING')).toEqual([]);
        expect(roles(scheduleEditRows('BIRTHDAY', [session('b', { isMain: true })]))).toEqual(['b']);
    });
});
