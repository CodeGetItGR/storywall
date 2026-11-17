'use client';

import { useTranslations } from 'next-intl';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/modal';
import { useInvitationThemePreview } from '@/hooks/useInvitationThemePreview';

// The theme full screen, as guests would see it, whatever its status.
export function InvitationThemePreviewOverlay({ themeId, onCloseAction }: { themeId: string; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.invitationThemes.previewOverlay');
    const { state, name, uploadedFonts } = useInvitationThemePreview(themeId);

    return (
        <Modal open onClose={onCloseAction} size="full" closeLabel={t('close')} ariaLabel={name ?? t('close')}>
            <Modal.Body className="bg-white">
                {/* Loading */}
                {state.status === 'loading' && <LoadingState size="md" className="h-full" />}

                {/* Failed */}
                {state.status === 'failed' && (
                    <p role="alert" className="flex h-full items-center justify-center p-6 text-sm text-status-danger">
                        {t('failed')}
                    </p>
                )}

                {/* Invitation */}
                {state.status === 'ready' && (
                    <InvitationRenderer
                        document={state.preview.document}
                        theme={state.preview.theme}
                        media={state.preview.media}
                        uploadedFonts={uploadedFonts}
                    />
                )}
            </Modal.Body>
        </Modal>
    );
}
