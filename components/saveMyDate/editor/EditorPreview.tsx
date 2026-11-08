'use client';

import { useTranslations } from 'next-intl';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { Modal } from '@/components/ui/modal';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type EditorPreviewProps = {
    open: boolean;
    onClose: () => void;
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    uploadedFonts?: InvitationFontDto[];
};

// The invitation full screen, with nothing of the editor around it.
export function EditorPreview({ open, onClose, document, theme, media, uploadedFonts }: EditorPreviewProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={open} onClose={onClose} size="full" ariaLabel={t('preview')} closeLabel={t('close')}>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <InvitationRenderer document={document} theme={theme} media={media} uploadedFonts={uploadedFonts} />
            </div>
        </Modal>
    );
}
