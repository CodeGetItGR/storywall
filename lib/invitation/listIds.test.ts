import { describe, expect, it } from 'vitest';

import { uniqueListItemIds, withUniqueListItemIds } from '@/lib/invitation/listIds';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS } from '@/lib/invitation/samples';

describe('uniqueListItemIds', () => {
    it('gives each repeated id one of its own, keeping the first', () => {
        const faq = {
            ...SAMPLE_SECTIONS.faq,
            data: { ...SAMPLE_SECTIONS.faq.data, items: ['q', 'q', 'q-2', 'q'].map((id, n) => ({ id, question: `${n}`, answer: '' })) },
        };
        const next = uniqueListItemIds(faq);
        expect(next.type === 'faq' && next.data.items.map((item) => item.id)).toEqual(['q', 'q-2', 'q-2-2', 'q-3']);
    });

    it('leaves lists without repeats as they are', () => {
        expect(uniqueListItemIds(SAMPLE_SECTIONS.godparents)).toBe(SAMPLE_SECTIONS.godparents);
        const document = { ...SAMPLE_DOCUMENT, sections: [SAMPLE_SECTIONS.godparents, SAMPLE_SECTIONS.faq] };
        expect(withUniqueListItemIds(document)).toBe(document);
    });

    it('fixes the people lists too', () => {
        const sponsors = { ...SAMPLE_SECTIONS.weddingSponsors, data: { ...SAMPLE_SECTIONS.weddingSponsors.data, sponsors: [{ id: 'k', name: 'A' }, { id: 'k', name: 'B' }] } };
        const document = withUniqueListItemIds({ ...SAMPLE_DOCUMENT, sections: [sponsors] });
        const next = document.sections[0];
        expect(next.type === 'weddingSponsors' && next.data.sponsors).toEqual([{ id: 'k', name: 'A' }, { id: 'k-2', name: 'B' }]);
    });
});
