import { FeedPhotoIssue } from '@/components/feed/edit/FeedPhotoIssue';
import { FramePhotoTools } from '@/components/saveMyDate/editor/photos/FramePhotoTools';
import { PhotoSlotTool } from '@/components/saveMyDate/editor/photos/PhotoSlotTool';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';
import { type PhotoSlot, photoSlotKey } from '@/lib/invitation/photoSlots';

type FeedFramePhotoToolsProps = { element: PhotoFrameElement; edit: InvitationEditorState['edit'] };

// Moves and zooms the photo in the theme's frame. A drag on it never opens the block's settings.
export function FeedFramePhotoTools({ element, edit }: FeedFramePhotoToolsProps) {
    return (
        <div data-feed-block-tools className="contents">
            <FramePhotoTools element={element} edit={edit} />
        </div>
    );
}

// The frame's camera, and why a photo isn't in it.
export function FeedFrameCamera({ slot, hasPhoto }: { slot: PhotoSlot; hasPhoto: boolean }) {
    return (
        <>
            <PhotoSlotTool slot={slot} hasPhoto={hasPhoto} />
            <div className="absolute inset-x-3 top-3 z-20">
                <FeedPhotoIssue photoKey={photoSlotKey(slot)} />
            </div>
        </>
    );
}
