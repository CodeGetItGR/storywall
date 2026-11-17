import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { BLANK_THEME_DESIGN, blankThemeDocument } from '@/lib/adminInvitationThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import { createSection } from '@/lib/invitation/newSection';
import type { ThemeDesign } from '@/lib/invitation/theme';
import {
    addElement,
    addFrame,
    addTransition,
    clampScale,
    DEFAULT_DECORATION_WIDTH,
    draggedArtScale,
    nameFromFile,
    referencedAssetIds,
    removeThemeItem,
    renameThemeItem,
    setArtImage,
    setArtScale,
    setBackgroundImage,
    setSectionDecoration,
    setShareImage,
} from '@/lib/invitation/themeAssets';

const design = (): ThemeDesign => structuredClone(BLANK_THEME_DESIGN);

function documentWith(...types: Array<'parentsSimple' | 'top'>): InvitationDocument {
    let n = 0;
    return { ...blankThemeDocument('WEDDING', 'garden'), sections: types.map((type) => createSection(type, 'WEDDING', () => `s${++n}`)) };
}

const decorationOf = (document: InvitationDocument, id: string) =>
    (document.sections.find((section) => section.id === id)?.data as { decoration?: { image: { assetId: string }; width: number } }).decoration;

describe('theme assets', () => {
    it('sets and clears a background image for one device', () => {
        const withImage = produce(design(), (draft) => setBackgroundImage(draft, 'top', 'mobile', 'bg-1'));
        expect(withImage.backgrounds.top.mobile).toEqual({ mediaId: 'bg-1' });
        expect(withImage.backgrounds.top.desktop).toBeUndefined();
        const cleared = produce(withImage, (draft) => setBackgroundImage(draft, 'top', 'mobile', null));
        expect(cleared.backgrounds.top.mobile).toBeUndefined();
        expect(cleared.backgrounds.top.mode).toBe('cover');
    });

    it('starts new art at its natural size and keeps size and animation on a replace', () => {
        const added = produce(design(), (draft) => setArtImage(draft, 'main', 'art-1'));
        expect(added.art.main).toEqual({ image: { mediaId: 'art-1' }, scale: 1, animation: 'none' });
        const sized = produce(added, (draft) => {
            draft.art.main!.scale = 1.5;
            draft.art.main!.animation = 'float';
        });
        const replaced = produce(sized, (draft) => setArtImage(draft, 'main', 'art-2'));
        expect(replaced.art.main).toEqual({ image: { mediaId: 'art-2' }, scale: 1.5, animation: 'float' });
        expect(produce(replaced, (draft) => setArtImage(draft, 'main', null)).art.main).toBeUndefined();
    });

    it('keeps art sizes in range', () => {
        expect(clampScale(9)).toBe(2.5);
        expect(clampScale(0.1)).toBe(0.4);
        expect(clampScale(1.234)).toBe(1.23);
        // Dragging right by the art's own width doubles it.
        expect(draggedArtScale(1, 420, 'main')).toBe(2);
        expect(draggedArtScale(1, -55, 'ceremonyIcon')).toBe(0.5);
        const withIcon = produce(design(), (draft) => setArtImage(draft, 'ceremonyIcon', 'icon'));
        const sized = produce(withIcon, (draft) => setArtScale(draft, 'ceremonyIcon', 3));
        expect(sized.art.ceremonyIcon?.scale).toBe(2.5);
        // No art, nothing to size.
        expect(produce(design(), (draft) => setArtScale(draft, 'main', 2)).art.main).toBeUndefined();
    });

    it('names an element after its file', () => {
        expect(nameFromFile({ name: 'gold.flourish.png' })).toBe('gold.flourish');
        expect(nameFromFile({ name: 'leaf' })).toBe('leaf');
    });

    it('adds and renames elements, frames and transitions', () => {
        const next = produce(design(), (draft) => {
            addElement(draft, { id: 'e1', name: 'Leaf', mediaId: 'leaf' });
            addFrame(draft, { id: 'f1', name: 'Gold', art: 'art', mask: 'mask', width: 800, height: 600 });
            addTransition(draft, { id: 't1', name: 'Wave', desktop: 'wave-d', mobile: null });
            addTransition(draft, { id: 't2', name: 'Lace', desktop: 'lace-d', mobile: 'lace-m' });
            renameThemeItem(draft, 'elements', 'e1', 'Olive leaf');
        });
        expect(next.elements).toEqual([{ id: 'e1', name: 'Olive leaf', image: { mediaId: 'leaf' } }]);
        expect(next.frames[0]).toEqual({ id: 'f1', name: 'Gold', art: { mediaId: 'art' }, mask: { mediaId: 'mask' }, width: 800, height: 600 });
        expect(next.transitions[0]).toEqual({ id: 't1', name: 'Wave', desktop: { mediaId: 'wave-d' } });
        expect(next.transitions[1].mobile).toEqual({ mediaId: 'lace-m' });
    });

    it('takes a removed item out of every section that used it', () => {
        const theme = produce(design(), (draft) => {
            addElement(draft, { id: 'e1', name: 'Leaf', mediaId: 'leaf' });
            addTransition(draft, { id: 't1', name: 'Wave', desktop: 'wave', mobile: null });
            addFrame(draft, { id: 'f1', name: 'Gold', art: 'art', mask: 'mask', width: 1, height: 1 });
        });
        const document = produce(documentWith('parentsSimple', 'top'), (draft) => {
            setSectionDecoration(draft, 's1', 'e1');
            draft.sections[1].style.transition = { assetId: 't1' } as never;
            draft.sections[1].elements.push({ id: 'img', kind: 'image', image: { source: 'theme', assetId: 'e1' }, width: 200 } as never);
        });
        const result = produce({ theme, document }, (draft) => {
            removeThemeItem(draft.theme, draft.document, 'elements', 'e1');
            removeThemeItem(draft.theme, draft.document, 'transitions', 't1');
        });
        expect(result.theme.elements).toEqual([]);
        expect(result.theme.transitions).toEqual([]);
        expect(result.theme.frames).toHaveLength(1);
        expect(decorationOf(result.document, 's1')).toBeUndefined();
        expect(result.document.sections[1].style.transition).toBeUndefined();
        expect(result.document.sections[1].elements.some((element) => element.id === 'img')).toBe(false);
    });

    it('puts an element in a family section and takes it out', () => {
        const picked = produce(documentWith('parentsSimple'), (draft) => setSectionDecoration(draft, 's1', 'e1'));
        expect(decorationOf(picked, 's1')).toEqual({ image: { source: 'theme', assetId: 'e1' }, width: DEFAULT_DECORATION_WIDTH });
        const resized = produce(picked, (draft) => {
            decorationOfDraft(draft).width = 300;
        });
        // Another element keeps the size the slot had.
        expect(decorationOf(produce(resized, (draft) => setSectionDecoration(draft, 's1', 'e2')), 's1')).toEqual({
            image: { source: 'theme', assetId: 'e2' },
            width: 300,
        });
        expect(decorationOf(produce(picked, (draft) => setSectionDecoration(draft, 's1', '')), 's1')).toBeUndefined();
    });

    it('leaves sections without an element slot alone', () => {
        const document = documentWith('top');
        expect(produce(document, (draft) => setSectionDecoration(draft, 's1', 'e1'))).toBe(document);
    });

    it('sets the share image', () => {
        expect(produce({ imageId: null as string | null }, (draft) => setShareImage(draft, 'og'))).toEqual({ imageId: 'og' });
    });

    it('lists every asset the theme still uses', () => {
        const theme = produce(design(), (draft) => {
            setBackgroundImage(draft, 'content', 'desktop', 'bg');
            setArtImage(draft, 'main', 'art');
            addElement(draft, { id: 'e1', name: 'Leaf', mediaId: 'leaf' });
            addFrame(draft, { id: 'f1', name: 'Gold', art: 'frame-art', mask: 'frame-mask', width: 1, height: 1 });
        });
        expect(referencedAssetIds(theme, documentWith('top'), 'og')).toEqual(new Set(['bg', 'art', 'leaf', 'frame-art', 'frame-mask', 'og']));
        expect(referencedAssetIds(design(), documentWith('top'), null).size).toBe(0);
    });
});

function decorationOfDraft(document: InvitationDocument) {
    return (document.sections[0].data as { decoration: { width: number } }).decoration;
}
