import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/lib/contrast';
import { wallThemeDesign } from '@/lib/feedLayout';
import { buttonTextOn, DEFAULT_BUTTON_TEXT } from '@/lib/invitation/buttonText';
import { buildRenderContext, themeCssVars } from '@/lib/invitation/render';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import { rsvpVars } from '@/lib/invitation/sectionCss';
import type { ThemeDesign } from '@/lib/invitation/theme';

const wall = wallThemeDesign(null);
const withColors = (colors: Partial<ThemeDesign['colors']>): ThemeDesign => ({ ...wall, colors: { ...wall.colors, ...colors } });
const contextFor = (theme: ThemeDesign) => buildRenderContext(SAMPLE_DOCUMENT, theme, () => undefined);
const buttonText = (theme: ThemeDesign) => (themeCssVars(contextFor(theme)) as Record<string, string | undefined>)['--btn-text'];

describe('buttonTextOn', () => {
    it.each(['#2f2b2d', '#000000', '#FFFFFF', '#777777', '#808080', '#c2185b', '#b8dfd3', '#1e88e5'])('reads on %s', (background) => {
        expect(contrastRatio(buttonTextOn(background), background)).toBeGreaterThanOrEqual(4.5);
    });

    it('reads a short colour', () => {
        expect(buttonTextOn('#000')).toBe('#FFFFFF');
    });

    it.each([undefined, 'transparent', '#00000000', '#0008', '#b8dfd3'])('keeps the default on %s', (background) => {
        expect(buttonTextOn(background)).toBe(DEFAULT_BUTTON_TEXT);
    });
});

describe('theme button text', () => {
    it('is white on the dark buttons of an event with no theme', () => {
        expect(buttonText(wall)).toBe('#FFFFFF');
    });

    it('follows the colour of the event', () => {
        expect(buttonText(withColors({ primary: '#F5E6D3' }))).toBe(DEFAULT_BUTTON_TEXT);
    });

    it('follows the button colour over the primary one', () => {
        expect(buttonText(withColors({ buttonBg: '#b8dfd3' }))).toBe(DEFAULT_BUTTON_TEXT);
    });

    it('stays the one the theme set', () => {
        expect(buttonText(withColors({ buttonText: '#333333' }))).toBe('#333333');
    });
});

describe('RSVP button text', () => {
    const textOf = (formStyle: { buttonBg?: string; buttonColor?: string }, theme = wall) =>
        (rsvpVars({ ...SAMPLE_SECTIONS.rsvp.data, formStyle }, 'normal', contextFor(theme)) as Record<string, string> | undefined)?.['--rsvp-btn-color'];

    it('reads on the button colour of the form', () => {
        expect(textOf({ buttonBg: '#b8dfd3' })).toBe(DEFAULT_BUTTON_TEXT);
        expect(textOf({ buttonBg: '#000000' })).toBe('#FFFFFF');
    });

    it('stays the one the host or the theme set', () => {
        expect(textOf({ buttonBg: '#000000', buttonColor: '#111111' })).toBe('#111111');
        expect(textOf({ buttonBg: '#000000' }, withColors({ buttonText: '#333333' }))).toBeUndefined();
    });

    it('is left to the theme on the button colour of the theme', () => {
        expect(textOf({})).toBeUndefined();
    });
});
