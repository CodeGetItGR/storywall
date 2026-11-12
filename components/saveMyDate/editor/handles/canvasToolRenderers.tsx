import { ColumnBreakTools, CustomItemTools } from '@/components/saveMyDate/editor/handles/CustomSectionTools';
import { DecorationSizeHandle } from '@/components/saveMyDate/editor/handles/DecorationSizeHandle';
import { ElementSizeHandle } from '@/components/saveMyDate/editor/handles/ElementSizeHandle';
import { PhotoSlotTool } from '@/components/saveMyDate/editor/photos/PhotoSlotTool';
import { isSizedElement } from '@/lib/invitation/canvasHandles';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { EditorMode } from '@/lib/invitation/sectionRules';

// What the renderer draws for the editor inside the invitation, as in the old editor:
// spacers, photo frames and the photo cameras for everyone; images, decorations and
// the custom section arrows for admins. The cameras need the editor's uploads.
export function canvasToolRenderers(mode: EditorMode, edit: InvitationEditorState['edit'], withPhotos = false): CanvasTools {
    const isAdmin = mode === 'admin';
    return {
        savedHeights: true,
        element: (element) => {
            if (!isSizedElement(element) || (element.kind === 'image' && !isAdmin)) return null;
            return <ElementSizeHandle element={element} edit={edit} />;
        },
        photo: withPhotos ? (slot, hasPhoto) => <PhotoSlotTool slot={slot} hasPhoto={hasPhoto} /> : undefined,
        decoration: isAdmin ? (sectionId, decoration) => <DecorationSizeHandle sectionId={sectionId} width={decoration.width} edit={edit} /> : undefined,
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
