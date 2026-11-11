import { describe, expect, it } from 'vitest';

import { wizardProgress } from '@/lib/createEventWizardProgress';

describe('wizardProgress', () => {
    it('counts only the steps that apply', () => {
        expect(wizardProgress('plan', ['type', 'plan', 'details', 'overview'])).toEqual({ current: 2, total: 4, percent: 50 });
    });

    it('starts the bar part-filled on the first step', () => {
        expect(wizardProgress('type', ['type', 'plan', 'details', 'theme', 'overview'])).toEqual({ current: 1, total: 5, percent: 20 });
    });

    it('treats an unknown step as the first', () => {
        expect(wizardProgress('theme', ['type', 'plan'])).toEqual({ current: 1, total: 2, percent: 50 });
    });
});
