import { afterEach, describe, expect, it, vi } from 'vitest';

import { closeWizard, leaveWizardEntry, pushWizardEntry, replaceWizardEntry, wizardDepth } from '@/lib/createEventWizardHistory';

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

    it('leaves a pushed step entry by going back one entry', () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        pushWizardEntry('/?create=1');
        pushWizardEntry('/?create=1&step=plan', 'step');
        leaveWizardEntry('step', '/?create=1&step=type');
        expect(back).toHaveBeenCalledTimes(1);
    });

    it('replaces an entry the page was loaded on instead of leaving the site', () => {
        window.history.replaceState(null, '', '/el?create=1&step=plan');
        const back = vi.spyOn(window.history, 'back');
        leaveWizardEntry('step', '/el?create=1&step=type');
        expect(back).not.toHaveBeenCalled();
        expect(window.location.search).toBe('?create=1&step=type');
    });

    it('does not go back from a step entry when asked to leave the sheet', () => {
        const back = vi.spyOn(window.history, 'back');
        pushWizardEntry('/?create=1&step=plan', 'step');
        leaveWizardEntry('sheet', '/?create=1&step=plan');
        expect(back).not.toHaveBeenCalled();
    });

    it('keeps the kind when an entry is replaced', () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        pushWizardEntry('/?create=1&step=plan&sheet=plans', 'sheet');
        replaceWizardEntry('/?create=1&step=plan&sheet=plans&run=r1');
        leaveWizardEntry('sheet', '/?create=1&step=plan&run=r1');
        expect(back).toHaveBeenCalledTimes(1);
    });
});
