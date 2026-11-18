import { describe, expect, it } from 'vitest';

import { convertState } from '@/lib/invitation/convert/convert';
import { MediaCollector } from '@/lib/invitation/convert/media';

const SUPABASE = 'https://abc.supabase.co/storage/v1/object/public/theme-assets/themes/1';

function section(type: string, data: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
    return { id: `s-${type}`, type, name: type, liveVisible: true, locked: false, data, texts: [], style: { mode: 'theme', color: '', image: '' }, ...extra };
}

function convert(sections: unknown[], theme: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
    return convertState({ state: { theme, sections, ...extra }, themeId: '1', themeName: 'Κύκνος' }, new MediaCollector());
}

describe('convertState', () => {
    it('converts a valid state with every setting mapped', () => {
        const result = convert([section('invitation', { text: 'Σας προσκαλούμε' }), section('footer', { text: '', link: '' })]);
        expect(result.errors).toEqual([]);
        expect(result.unmapped).toEqual([]);
        expect(result.document.sections.map((s) => s.type)).toEqual(['invitation', 'footer']);
    });

    it('reports old settings with no mapping', () => {
        const result = convert([section('invitation', { text: '', sparkle: true })], { glitter: 1 });
        expect(result.unmapped).toEqual(['invitation.data.sparkle', 'theme.glitter']);
    });

    it('drops editor-only state', () => {
        const result = convert([], {}, { selectedSection: 'x', recentTextColors: ['#fff'], _wedart: { rendererVersion: 8 } });
        expect(result.unmapped).toEqual([]);
    });

    it('points list styles at item ids and falls back to marginY', () => {
        const result = convert([
            section('program', {
                title: 'Πρόγραμμα',
                items: [{ id: 'a1', time: '18:00', label: 'Γάμος' }],
                _style: { 'items.0.label': { color: '#ff0000', marginY: 12 }, 'items.5.label': { color: '#000' } },
            }),
        ]);
        const program = result.document.sections[0];
        expect(program.textStyles).toEqual({ 'items.a1.label': { color: '#ff0000', marginTop: 12, marginBottom: 12 } });
        expect(result.warnings.some((w) => w.includes('items.5.label'))).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('turns the action button into an empty custom section', () => {
        const result = convert([section('actionButton', { title: 'x', buttonText: 'y', url: 'https://a.gr' })]);
        expect(result.document.sections[0]).toMatchObject({ type: 'blank', data: {} });
        expect(result.unmapped).toEqual([]);
    });

    it('keeps a saved footer height under 80px', () => {
        const result = convert([section('footer', { text: 'Τέλος', link: '' }, { style: { mode: 'color', color: '#fff', image: '', minHeight: 59, paddingY: 20 } })]);
        expect(result.ok).toBe(true);
        expect(result.document.sections[0].style.minHeight).toBe(59);
    });

    it('keeps the footer last and locked', () => {
        const result = convert([section('footer', { text: 'Τέλος', link: '' }), section('invitation', { text: '' })]);
        expect(result.document.sections.map((s) => [s.type, s.locked])).toEqual([['invitation', false], ['footer', true]]);
        expect(result.ok).toBe(true);
    });

    it('joins the two old sponsor names', () => {
        const result = convert([
            section('weddingSponsorsSimple', {
                sponsorsTitle: 'Κουμπάροι',
                sponsor1Name: 'Μαρία',
                sponsor2Name: 'Νίκος',
                _style: { sponsor1Name: { size: 20 }, sponsor2Name: { size: 30 } },
            }),
        ]);
        const sponsors = result.document.sections[0];
        expect(sponsors.data).toMatchObject({ sponsorsNames: 'Μαρία\nΝίκος' });
        expect(sponsors.textStyles).toEqual({ sponsorsNames: { size: 20 } });
    });

    it('removes transitions and frames from another theme', () => {
        const result = convert(
            [section('blank', {}, {
                style: { mode: 'theme', color: '', image: '', transition: { assetId: 'transition-9', edge: 'bottom' } },
                texts: [{ id: 'f1', kind: 'photoFrame', frameId: 'frame-9', src: '' }],
            })],
        );
        const blank = result.document.sections[0];
        expect(blank.style.transition).toBeUndefined();
        expect(blank.elements[0]).toMatchObject({ kind: 'photoFrame', frameId: '' });
        expect(result.ok).toBe(true);
    });

    it('gives theme elements and media stable ids', () => {
        const theme = { elements: [`${SUPABASE}/element-1.png`] };
        const sections = [section('blank', {}, { texts: [{ id: 'i1', kind: 'image', src: `${SUPABASE}/element-1.png`, width: 200 }] })];
        const first = convert(sections, { ...theme, mainArt: `${SUPABASE}/art.png` });
        const second = convert(sections, { ...theme, mainArt: `${SUPABASE}/art.png` });
        expect(first.theme.design.elements[0].name).toBe('Κύκνος, διακοσμητικό 1');
        expect(first.document.sections[0].elements[0]).toMatchObject({ image: { source: 'theme', assetId: first.theme.design.elements[0].id } });
        expect(first.theme.design.art.main?.image).toEqual(second.theme.design.art.main?.image);
        expect(first.ok).toBe(true);
    });

    it('records where each file lives in the old storage', () => {
        const media = new MediaCollector();
        const id = media.add(`${SUPABASE}/a%20b.png`);
        expect(media.all()).toEqual([{ mediaId: id, storagePath: 'theme-assets/themes/1/a b.png' }]);
    });

    it('keeps only the host’s own text colour and preset on a site', () => {
        const template = convert([], { textColor: '#111111', typographyPresetId: '3', typographyPresetForce: false }).theme;
        const site = convertState(
            { state: { theme: { textColor: '#222222', typographyPresetId: '3', typographyPresetForce: false }, sections: [] }, themeId: '1', themeName: 'Κύκνος', template },
            new MediaCollector(),
        );
        expect(site.document.overrides).toEqual({ textColor: '#222222' });
    });
});
