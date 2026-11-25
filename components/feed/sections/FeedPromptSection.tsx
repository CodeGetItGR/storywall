'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useFeedPhotoPrompt } from '@/hooks/useFeedPhotoPrompt';

type FeedPromptSectionProps = { text: string; placeholder?: ReactNode; inEditor?: boolean };

// The host's photo prompt: a dashed photo slot. A tap picks photos, then opens the post composer with them; posts
// aren't tagged with it. A viewer who can't post sees nothing, except the host in the editor.
export function FeedPromptSection({ text, placeholder = null, inEditor = false }: FeedPromptSectionProps) {
    const t = useTranslations('FeedEditor');
    const { canPost, accept, inputRef, pick, onFiles } = useFeedPhotoPrompt();
    if (!text.trim()) return placeholder;
    if (!canPost && !inEditor) return null;

    return (
        <div className="relative px-4 py-3 font-sans">
            {/* Photo slot */}
            <button
                type="button"
                onClick={pick}
                className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-[#f2885c]/50 bg-event-card px-6 py-7 text-center focus-ring"
            >
                <Image src="/icons/camera.svg" alt={t('addPhoto')} width={34} height={28} className="h-auto w-[34px]" unoptimized />
                <span className="max-w-full text-lg font-semibold text-balance wrap-break-word text-ink">{text}</span>
                {/* The icon's alt already names the action */}
                <span aria-hidden="true" className="flex h-11 items-center rounded-full bg-(image:--logo) px-6 text-sm font-semibold text-white">
                    {t('addPhoto')}
                </span>
            </button>

            {/* Photo picker: opened by the slot's button only */}
            <input ref={inputRef} type="file" accept={accept} multiple className="sr-only" onChange={onFiles} aria-hidden="true" tabIndex={-1} />
        </div>
    );
}
