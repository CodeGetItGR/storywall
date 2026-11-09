import { describe, expect, it } from 'vitest';

import { testEntry } from '../testing/fixture';
import { CAPTURE_ORDER, capturesInOrder } from './captures';

describe('captures', () => {
    it('takes each language, then each width', () => {
        expect(CAPTURE_ORDER).toEqual([
            { locale: 'en', width: 'mobile' },
            { locale: 'en', width: 'desktop' },
            { locale: 'el', width: 'mobile' },
            { locale: 'el', width: 'desktop' },
        ]);
    });

    it('orders captures by language, then width', () => {
        const entries = [testEntry('el', { locale: 'el' }), testEntry('desktop', { width: 'desktop' }), testEntry('mobile')];
        expect(capturesInOrder(entries).map((entry) => entry.id)).toEqual(['mobile', 'desktop', 'el']);
    });
});
