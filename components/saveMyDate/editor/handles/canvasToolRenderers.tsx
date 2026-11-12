import { ArtSizeHandle } from '@/components/saveMyDate/editor/handles/ArtSizeHandle';
import { ColumnBreakTools, CustomItemTools } from '@/components/saveMyDate/editor/handles/CustomSectionTools';
import { DecorationPicker } from '@/components/saveMyDate/editor/handles/DecorationPicker';
import { DecorationSizeHandle } from '@/components/saveMyDate/editor/handles/DecorationSizeHandle';
import { ElementSizeHandle } from '@/components/saveMyDate/editor/handles/ElementSizeHandle';
import { isSizedElement } from '@/lib/invitation/canvasHandles';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { InvitationEditorState, InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { EditorMode } from '@/lib/invitation/sectionRules';

// What the renderer draws for the editor inside the invitation, as in the old editor:
// spacers and photo frames for everyone; images, decorations and the custom section
// arrows for admins; in an admin's theme editor, the element slots and the art sizes too.
export function canvasToolRenderers(mode: EditorMode, edit: InvitationEditorState['edit'], store?: InvitationEditorStore): CanvasTools {
    const isAdmin = mode === 'admin';
    const themeStore = isAdmin && store?.getState().theme ? store : undefined;
    return {
        savedHeights: true,
        element: (element) => {
            if (!isSizedElement(element) || (element.kind === 'image' && !isAdmin)) return null;
            return <ElementSizeHandle element={element} edit={edit} />;
        },
        decoration: isAdmin ? (sectionId, decoration) => <DecorationSizeHandle sectionId={sectionId} width={decoration.width} edit={edit} /> : undefined,
        decorationSlot: themeStore
            ? (sectionId, decoration) => <DecorationPicker store={themeStore} sectionId={sectionId} decoration={decoration} />
            : undefined,
        art: themeStore ? (slot, scale) => <ArtSizeHandle store={themeStore} slot={slot} scale={scale} /> : undefined,
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
