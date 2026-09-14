import { describe, expect, it } from 'vitest';

import { manageSectionGroups, parseManageSection } from '@/lib/manageSections';

describe('manageSections', () => {
    it('places help in the event group, after settings and before danger', () => {
        const eventGroup = manageSectionGroups.find((entry) => entry.group === 'event');
        expect(eventGroup?.sections).toEqual(['overview', 'settings', 'help', 'danger']);
    });

    it('parseManageSection resolves "help"', () => {
        expect(parseManageSection('help')).toBe('help');
    });

    it('billing group resolves to the single merged "billing" section', () => {
        const billingGroup = manageSectionGroups.find((entry) => entry.group === 'billing');
        expect(billingGroup?.sections).toEqual(['billing']);
    });
});
