import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { defaultFeedLayout } from '@/lib/feedLayout';
import { addPinnedPhoto, movePinnedPhoto, pinnedPhotos, removePinnedPhoto } from '@/lib/feedPinned';
import { createFeedModeSection } from '@/lib/feedSections';

const base = defaultFeedLayout();
const layout = { ...base, sections: [...base.sections, createFeedModeSection('feedPinned', () => 'pp')] };
const photosOf = (document: typeof layout) => pinnedPhotos(document.sections.find((section) => section.id === 'pp')!);
const withPhotos = (count: number) => {
    let next = layout;
    for (let i = 1; i <= count; i++) next = produce(next, addPinnedPhoto('pp', `p${i}`, `img-${i}`));
    return next;
};
const ids = (document: typeof layout) => photosOf(document).map((photo) => photo.id);

describe('Pinned photos edits', () => {
    it('adds photos at the end, up to six', () => {
        expect(ids(withPhotos(7))).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
        expect(photosOf(withPhotos(1))).toEqual([{ id: 'p1', image: { source: 'media', mediaId: 'img-1' } }]);
    });

    it('removes one', () => {
        expect(ids(produce(withPhotos(2), removePinnedPhoto('pp', 'p1')))).toEqual(['p2']);
    });

    it('leaves any other section alone', () => {
        expect(produce(layout, addPinnedPhoto('feed-feedCover', 'p1', 'img-1'))).toEqual(layout);
        expect(produce(layout, removePinnedPhoto('feed-feedCover', 'p1'))).toEqual(layout);
        expect(pinnedPhotos(layout.sections[0])).toEqual([]);
    });

    it('moves a photo to where the host drops it', () => {
        const three = withPhotos(3);
        expect(ids(produce(three, movePinnedPhoto('pp', 'p3', 'p1')))).toEqual(['p3', 'p1', 'p2']);
        expect(ids(produce(three, movePinnedPhoto('pp', 'p1', 'p3')))).toEqual(['p2', 'p3', 'p1']);
        expect(produce(three, movePinnedPhoto('pp', 'p1', 'gone'))).toEqual(three);
    });
});
