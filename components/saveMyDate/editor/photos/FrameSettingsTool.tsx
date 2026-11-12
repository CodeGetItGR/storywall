'use client';

import { useTranslations } from 'next-intl';

import { useFrameSettings } from '@/hooks/useFrameSettings';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';

export type FrameChoice = { id: string; name: string };

type FrameSettingsToolProps = {
    element: PhotoFrameElement;
    // The theme's frames.
    frames: readonly FrameChoice[];
    edit: InvitationEditorState['edit'];
};

const SELECT =
    'h-9 max-w-full rounded-md border border-black/20 bg-white px-2 font-sans text-xs text-[#2b2724] shadow-sm focus-visible:ring-2 focus-visible:ring-(--smd-editor-accent) focus-visible:outline-none';

// Admins: which of the theme's frames this is, and how it comes in. Top left, as in the old editor.
export function FrameSettingsTool({ element, frames, edit }: FrameSettingsToolProps) {
    const t = useTranslations('InvitationEditor.photos');
    const { frameId, animation, animations, onFrame, onAnimation } = useFrameSettings(element, edit);

    return (
        <div className="absolute top-2.5 left-2.5 z-20 flex max-w-[calc(100%-20px)] flex-col items-start gap-1.5" data-smd-keep-text="">
            {/* Frame */}
            {frames.length === 0 ? (
                <span className="rounded-md bg-white/90 px-2 py-1 text-xs text-[#a43f47]">{t('noFrames')}</span>
            ) : (
                <select aria-label={t('frame')} title={t('frame')} value={frameId} onChange={onFrame} className={SELECT}>
                    <option value="">{t('chooseFrame')}</option>
                    {frames.map((frame) => (
                        <option key={frame.id} value={frame.id}>
                            {frame.name}
                        </option>
                    ))}
                </select>
            )}

            {/* Effect */}
            <select aria-label={t('frameEffect')} title={t('frameEffect')} value={animation} onChange={onAnimation} className={SELECT}>
                {animations.map((value) => (
                    <option key={value} value={value}>
                        {t(`frameEffects.${value}`)}
                    </option>
                ))}
            </select>
        </div>
    );
}
