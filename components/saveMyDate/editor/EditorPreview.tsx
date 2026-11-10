'use client';

import { useTranslations } from 'next-intl';

import { PreviewWidthSwitch } from '@/components/saveMyDate/editor/preview/PreviewWidthSwitch';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { Modal } from '@/components/ui/modal';
import { type PreviewWidth, usePreviewWidth } from '@/hooks/usePreviewWidth';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';
import { cn } from '@/lib/utils';

type EditorPreviewProps = {
    open: boolean;
    onClose: () => void;
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    uploadedFonts?: InvitationFontDto[];
    // The width it opens at on tablets and computers. Phones always show their own width.
    initialWidth?: PreviewWidth;
};

// The invitation as guests see it, with nothing of the editor around it: effects run, the FAQ opens,
// the gallery browses, and an RSVP sent here is not saved.
export function EditorPreview({ open, onClose, document, theme, media, uploadedFonts, initialWidth }: EditorPreviewProps) {
    const t = useTranslations('InvitationEditor');
    const { width, setWidth } = usePreviewWidth(initialWidth);

    return (
        <Modal open={open} onClose={onClose} size="full" ariaLabel={t('preview')} closeLabel={t('close')}>
            <div className="smd-editor flex min-h-0 flex-1 flex-col [background:var(--smd-editor-canvas)]">
                {/* Screen size */}
                <div className="hidden h-14 shrink-0 items-center justify-center border-b border-(--smd-editor-line) bg-(--smd-editor-bar) px-14 md:flex">
                    <PreviewWidthSwitch value={width} onChange={setWidth} />
                </div>

                {/* Invitation */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div
                        data-preview-width={width}
                        className={cn(
                            'mx-auto w-full',
                            width === 'mobile' &&
                                'md:my-6 md:max-w-97.5 md:overflow-hidden md:rounded-[26px] md:shadow-[0_24px_70px_rgba(0,0,0,0.5)]',
                        )}
                    >
                        <InvitationRenderer document={document} theme={theme} media={media} uploadedFonts={uploadedFonts} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
