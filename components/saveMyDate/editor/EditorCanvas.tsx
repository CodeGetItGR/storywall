import { useEditableTextRenderer } from '@/components/saveMyDate/editor/text/EditableTextContext';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type EditorCanvasProps = {
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    uploadedFonts?: InvitationFontDto[];
};

// The invitation being edited, drawn by the same renderer guests see. It scrolls on its own.
export function EditorCanvas({ document, theme, media, uploadedFonts }: EditorCanvasProps) {
    const renderText = useEditableTextRenderer();

    return (
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-2 [background:var(--smd-editor-canvas)] sm:p-6">
            <div className="mx-auto w-full max-w-245 overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                <InvitationRenderer document={document} theme={theme} media={media} uploadedFonts={uploadedFonts} renderText={renderText} />
            </div>
        </main>
    );
}
