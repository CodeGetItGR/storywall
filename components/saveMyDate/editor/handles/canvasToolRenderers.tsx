import { ColumnBreakTools, CustomItemTools } from '@/components/saveMyDate/editor/handles/CustomSectionTools';
import { DecorationSizeHandle } from '@/components/saveMyDate/editor/handles/DecorationSizeHandle';
import { ElementSizeHandle } from '@/components/saveMyDate/editor/handles/ElementSizeHandle';
import { FramePhotoTools } from '@/components/saveMyDate/editor/photos/FramePhotoTools';
import { type FrameChoice, FrameSettingsTool } from '@/components/saveMyDate/editor/photos/FrameSettingsTool';
import { GalleryEmptyTool } from '@/components/saveMyDate/editor/photos/gallery/GalleryEmptyTool';
import { PhotoBandMoveTool } from '@/components/saveMyDate/editor/photos/PhotoBandMoveTool';
import { PhotoSlotTool } from '@/components/saveMyDate/editor/photos/PhotoSlotTool';
import { isSizedElement } from '@/lib/invitation/canvasHandles';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { EditorMode } from '@/lib/invitation/sectionRules';

type CanvasToolOptions = {
    // The cameras need the editor's uploads.
    withPhotos?: boolean;
    // The theme's frames, for the admin's frame list.
    frames?: readonly FrameChoice[];
};

// What the renderer draws for the editor inside the invitation, as in the old editor:
// spacers, photo frames, moving and zooming photos, the photo cameras and an empty gallery for everyone;
// images, decorations, frame choices and the custom section arrows for admins.
export function canvasToolRenderers(
    mode: EditorMode,
    edit: InvitationEditorState['edit'],
    { withPhotos = false, frames = [] }: CanvasToolOptions = {},
): CanvasTools {
    const isAdmin = mode === 'admin';
    return {
        savedHeights: true,
        element: (element) => {
            if (!isSizedElement(element) || (element.kind === 'image' && !isAdmin)) return null;
            return <ElementSizeHandle element={element} edit={edit} />;
        },
        photo: withPhotos ? (slot, hasPhoto) => <PhotoSlotTool slot={slot} hasPhoto={hasPhoto} /> : undefined,
        gallery: withPhotos ? (sectionId, images) => <GalleryEmptyTool sectionId={sectionId} images={images} edit={edit} /> : undefined,
        framePhoto: (element) => <FramePhotoTools element={element} edit={edit} />,
        frameSettings: isAdmin ? (element) => <FrameSettingsTool element={element} frames={frames} edit={edit} /> : undefined,
        photoBand: (sectionId, imageY) => <PhotoBandMoveTool sectionId={sectionId} imageY={imageY} edit={edit} />,
        decoration: isAdmin
            ? (sectionId, decoration) => <DecorationSizeHandle sectionId={sectionId} width={decoration.width} edit={edit} />
            : undefined,
        customItem: isAdmin
            ? (sectionId, elements, item, content) => (
                  <CustomItemTools sectionId={sectionId} elements={elements} itemId={item.id} edit={edit}>
                      {content}
                  </CustomItemTools>
              )
            : undefined,
        columnBreak: isAdmin
            ? (sectionId, elements, breakId) => <ColumnBreakTools sectionId={sectionId} elements={elements} breakId={breakId} edit={edit} />
            : undefined,
    };
}
