import { describe, expect, it } from 'vitest';

import { storyMedia } from '@/.storybook/fixtures';
import { eventPhotoChoices, eventPhotoRef, pickedEventPhotoIds, toggleEventPhoto } from '@/lib/invitation/eventPhotos';

describe('eventPhotoChoices', () => {
    it('offers only ready images that are not deleted, by their thumbnail when there is one', () => {
        const choices = eventPhotoChoices([
            storyMedia('a', { thumbnailUrl: 'https://cdn.test/a-thumb.jpg' }),
            storyMedia('video', { mediaType: 'VIDEO' }),
            storyMedia('processing', { status: 'PROCESSING' }),
            storyMedia('deleted', { deletedAt: '2026-11-01T10:00:00Z' }),
            storyMedia('no-url', { mediaUrl: null }),
            storyMedia('b', { mediaUrl: 'https://cdn.test/b.jpg' }),
        ]);

        expect(choices).toEqual([
            { mediaId: 'a', url: 'https://cdn.test/a-thumb.jpg' },
            { mediaId: 'b', url: 'https://cdn.test/b.jpg' },
        ]);
    });
});

describe('toggleEventPhoto', () => {
    it('adds at the end, takes out, and stops at the limit', () => {
        expect(toggleEventPhoto(['a'], 'b', 3)).toEqual(['a', 'b']);
        expect(toggleEventPhoto(['a', 'b'], 'a', 3)).toEqual(['b']);
        expect(toggleEventPhoto(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
    });
});

describe('pickedEventPhotoIds', () => {
    it("reads only the event's photos from an image list", () => {
        expect(pickedEventPhotoIds([{ source: 'media', mediaId: 'm-1' }, eventPhotoRef('e-1'), eventPhotoRef('e-2')])).toEqual(['e-1', 'e-2']);
    });
});
