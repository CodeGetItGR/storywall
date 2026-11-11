import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeWizard, pushWizardEntry, replaceWizardEntry, wizardDepth } from '@/lib/createEventWizardHistory';

afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
});

describe('wizard history', () => {
    it('counts how deep into the wizard each entry is', () => {
        expect(wizardDepth()).toBe(0);
        pushWizardEntry('/?create=1');
        expect(wizardDepth()).toBe(1);
        pushWizardEntry('/?create=1&step=plan');
        expect(wizardDepth()).toBe(2);
    });

    it('keeps the depth when an entry is replaced', () => {
        pushWizardEntry('/?create=1');
        replaceWizardEntry('/?create=1&run=r1');
        expect(window.location.search).toBe('?create=1&run=r1');
        expect(wizardDepth()).toBe(1);
    });

    it('closes by going back past every wizard entry', () => {
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
        pushWizardEntry('/?create=1');
        pushWizardEntry('/?create=1&step=plan');
        closeWizard();
        expect(go).toHaveBeenCalledWith(-2);
    });

    it('closes a page loaded with the wizard open by removing its params', () => {
        window.history.replaceState(null, '', '/el?src=ig&create=1&step=plan');
        const go = vi.spyOn(window.history, 'go');
        closeWizard();
        expect(go).not.toHaveBeenCalled();
        expect(`${window.location.pathname}${window.location.search}`).toBe('/el?src=ig');
    });
});
