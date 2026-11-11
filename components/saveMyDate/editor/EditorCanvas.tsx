import { useCanvasHandles } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { EditorSections, type SectionSettingsOpener } from '@/components/saveMyDate/editor/sections/EditorSections';
import { useEditableTextRenderer } from '@/components/saveMyDate/editor/text/EditableTextContext';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { SectionActions } from '@/hooks/useSectionActions';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type EditorCanvasProps = {
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    uploadedFonts?: InvitationFontDto[];
    // Section tools; without them the canvas only shows the invitation.
    sections?: SectionActions;
    sectionSettings?: SectionSettingsOpener;
};

// The invitation being edited, drawn by the same renderer guests see. It scrolls on its own.
export function EditorCanvas({ document, theme, media, uploadedFonts, sections, sectionSettings }: EditorCanvasProps) {
    const renderText = useEditableTextRenderer();
    const canvasTools = useCanvasHandles()?.tools;
    const renderer = (wrapSection?: Parameters<typeof InvitationRenderer>[0]['wrapSection']) => (
        <InvitationRenderer
            document={document}
            theme={theme}
            media={media}
            uploadedFonts={uploadedFonts}
            showHidden={wrapSection !== undefined}
            wrapSection={wrapSection}
            renderText={renderText}
            canvasTools={canvasTools}
        />
    );

    return (
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-2 [background:var(--smd-editor-canvas)] sm:p-6">
            <div className="mx-auto w-full max-w-245 overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                {sections ? (
                    <EditorSections actions={sections} settings={sectionSettings}>
                        {renderer}
                    </EditorSections>
                ) : (
                    renderer()
                )}
            </div>
        </main>
    );
}
