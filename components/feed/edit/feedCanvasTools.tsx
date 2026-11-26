import { FeedPersonPhotoTools } from '@/components/feed/edit/FeedPersonPhotoTools';
import { FeedPhotoIssue } from '@/components/feed/edit/FeedPhotoIssue';
import { FeedPhotoRemove } from '@/components/feed/edit/FeedPhotoRemove';
import { FeedPhotoSlotProgress } from '@/components/feed/edit/FeedPhotoSlotProgress';
import { GalleryEmptyTool } from '@/components/saveMyDate/editor/photos/gallery/GalleryEmptyTool';
import { PhotoSlotTool } from '@/components/saveMyDate/editor/photos/PhotoSlotTool';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { PhotoFieldSlot } from '@/lib/invitation/photoSlots';

type FeedCanvasToolOptions = {
    edit: InvitationEditorState['edit'];
    // An added photo's ✕.
    onRemoveElement: (elementId: string) => void;
    onRemovePhoto: (slot: PhotoFieldSlot) => void;
};

// Feed edit mode's tools inside a Save my date block: a photo the host added gets a ✕ (Open question 7), a person's
// photo can be added, changed and deleted, and an empty gallery takes its first photos. The renderer leaves these
// places, so guests get none of it.
export function feedCanvasTools({ edit, onRemoveElement, onRemovePhoto }: FeedCanvasToolOptions): CanvasTools {
    return {
        element: (element) => (element.kind === 'image' ? <FeedPhotoRemove elementId={element.id} onRemove={onRemoveElement} /> : null),
        photo: (slot, hasPhoto) =>
            hasPhoto && slot.kind === 'field' ? <FeedPhotoSlotProgress slot={slot} /> : <PhotoSlotTool slot={slot} hasPhoto={hasPhoto} />,
        personPhoto: (slot, hasPhoto, photo) => (
            <FeedPersonPhotoTools slot={slot} hasPhoto={hasPhoto} onRemove={onRemovePhoto}>
                {photo}
            </FeedPersonPhotoTools>
        ),
        gallery: (sectionId, images) => (
            <>
                <GalleryEmptyTool sectionId={sectionId} images={images} edit={edit} />
                <FeedPhotoIssue sectionId={sectionId} />
            </>
        ),
    };
}
