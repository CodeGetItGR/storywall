import { describe, expect, it } from 'vitest';

import { countsByValue, defaultSideLabelKeys, isPickType, percentOf, pickOptions, tallyTotal, typesFor } from './quizPolls';

const sides = { he: 'Groom', she: 'Bride' };
const yesNo = { yes: 'Yes', no: 'No' };

describe('quizPolls', () => {
    it('limits quiz questions to types with one exact answer', () => {
        expect(typesFor('QUIZ')).toEqual(['CHOICE', 'YES_NO', 'HE_SHE']);
        expect(typesFor('POLL')).toHaveLength(8);
        expect(isPickType('HE_SHE')).toBe(true);
        expect(isPickType('FREE_TEXT')).toBe(false);
    });

    it('names the sides after the couple for a wedding and the parents for a baptism', () => {
        expect(defaultSideLabelKeys('WEDDING')).toEqual({ he: 'groom', she: 'bride' });
        expect(defaultSideLabelKeys('BAPTISM')).toEqual({ he: 'dad', she: 'mum' });
    });

    it('offers the canonical values of each pick type', () => {
        expect(pickOptions({ answerType: 'HE_SHE', options: null }, sides, yesNo)).toEqual([
            { value: 'HE', label: 'Groom' },
            { value: 'SHE', label: 'Bride' },
        ]);
        expect(pickOptions({ answerType: 'YES_NO', options: null }, sides, yesNo).map((option) => option.value)).toEqual(['YES', 'NO']);
        expect(
            pickOptions(
                {
                    answerType: 'CHOICE',
                    options: [
                        { id: 'o1', label: 'Paris' },
                        { id: 'o2', label: 'Rome' },
                    ],
                },
                sides,
                yesNo,
            ),
        ).toEqual([
            { value: 'o1', label: 'Paris' },
            { value: 'o2', label: 'Rome' },
        ]);
        expect(pickOptions({ answerType: 'NUMBER', options: null }, sides, yesNo)).toEqual([]);
    });

    it('sums and indexes a tally', () => {
        const tally = [
            { value: 'HE', count: 3 },
            { value: 'SHE', count: 1 },
        ];
        expect(tallyTotal(tally)).toBe(4);
        expect(tallyTotal(null)).toBe(0);
        expect(countsByValue(tally).get('HE')).toBe(3);
        expect(percentOf(1, 3)).toBe(33);
        expect(percentOf(0, 0)).toBe(0);
    });
});
