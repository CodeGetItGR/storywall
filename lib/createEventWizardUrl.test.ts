import { describe, expect, it } from 'vitest';

import {
    CREATE_WIZARD_PARAM,
    isCreateEventHref,
    isWizardOpen,
    withoutWizardParams,
    withWizardParams,
    wizardUrlForLink,
} from '@/lib/createEventWizardUrl';

const ORIGIN = 'https://www.storywall.gr';
const at = (path: string) => new URL(path, ORIGIN);

describe('isCreateEventHref', () => {
    it('matches the create page with or without params', () => {
        expect(isCreateEventHref('/events/new', ORIGIN)).toBe(true);
        expect(isCreateEventHref('/events/new?type=wedding&code=SPRING', ORIGIN)).toBe(true);
        expect(isCreateEventHref(`${ORIGIN}/events/new`, ORIGIN)).toBe(true);
    });

    it('ignores other pages and other sites', () => {
        expect(isCreateEventHref('/events/new/extra', ORIGIN)).toBe(false);
        expect(isCreateEventHref('/home', ORIGIN)).toBe(false);
        expect(isCreateEventHref('https://example.com/events/new', ORIGIN)).toBe(false);
        expect(isCreateEventHref('#pricing', ORIGIN)).toBe(false);
    });
});

describe('wizardUrlForLink', () => {
    it("opens the pop-up on the current page with the link's params", () => {
        expect(wizardUrlForLink('/events/new?type=baptism&code=SPRING', at('/el/vaptisi?src=ig#faq'))).toBe(
            `/el/vaptisi?src=ig&${CREATE_WIZARD_PARAM}=1&type=baptism&code=SPRING#faq`,
        );
    });

    it('drops wizard params left from an earlier run', () => {
        expect(wizardUrlForLink('/events/new', at('/?create=1&step=details&run=abc'))).toBe('/?create=1');
    });
});

describe('withWizardParams', () => {
    it('sets and removes params, keeping the rest', () => {
        expect(withWizardParams(at('/?create=1&type=wedding&step=type'), { step: 'plan', run: 'r1' })).toBe(
            '/?create=1&type=wedding&step=plan&run=r1',
        );
        expect(withWizardParams(at('/events/new?step=plan'), { step: null })).toBe('/events/new');
    });
});

describe('withoutWizardParams', () => {
    it('removes every wizard param and keeps the page', () => {
        expect(withoutWizardParams(at('/el?src=ig&create=1&step=plan&run=r&type=wedding&plan=BASIC&option=o&code=C#top'))).toBe('/el?src=ig#top');
    });
});

describe('isWizardOpen', () => {
    it('is open only on create=1', () => {
        expect(isWizardOpen(new URLSearchParams('create=1'))).toBe(true);
        expect(isWizardOpen(new URLSearchParams('create=0'))).toBe(false);
        expect(isWizardOpen(new URLSearchParams(''))).toBe(false);
    });
});
