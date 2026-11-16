import { describe, expect, it } from 'vitest';

import { faqItemHasContent, personHasContent, stayHasContent, stayMapUrl } from '@/lib/invitation/listContent';
import { EDITABLE_LISTS } from '@/lib/invitation/listEdits';

const stay = (fields: Partial<ReturnType<typeof EDITABLE_LISTS.stays.blank>> = {}) => ({ ...EDITABLE_LISTS.stays.blank('h'), ...fields });

describe('list content', () => {
    it('counts only text that is more than spaces', () => {
        expect(faqItemHasContent({ id: 'q', question: ' ', answer: '' })).toBe(false);
        expect(faqItemHasContent({ id: 'q', question: '', answer: 'Ναι.' })).toBe(true);
        expect(stayHasContent(stay())).toBe(false);
        expect(stayHasContent(stay({ email: 'a@b.gr' }))).toBe(true);
    });

    it('keeps a person with a photo and no name', () => {
        expect(personHasContent({ id: 'g', name: '' })).toBe(false);
        expect(personHasContent({ id: 'g', name: '', photo: { source: 'media', mediaId: 'm' } })).toBe(true);
    });

    it('gives a place to stay a map link only when there is something to find', () => {
        expect(stayMapUrl(stay())).toBe('');
        expect(stayMapUrl(stay({ mapUrl: 'https://maps.app.goo.gl/x' }))).toBe('https://maps.app.goo.gl/x');
        expect(stayMapUrl(stay({ address: 'Ρόδος' }))).toContain(encodeURIComponent('Ρόδος'));
    });
});
