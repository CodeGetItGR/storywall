'use client';

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { useComposer } from '@/providers/composer/ComposerContext';

// The host's photo prompt: one line with a plus. Tapping it opens the post composer; posts aren't tagged with it.
export function FeedPromptSection({ text, placeholder = null }: { text: string; placeholder?: ReactNode }) {
    const { openPostComposer, canComposePost } = useComposer();
    if (!text.trim()) return placeholder;

    const line = <span className="min-w-0 flex-1 text-left text-sm font-medium wrap-break-word text-ink">{text}</span>;

    return (
        <div className="px-4 py-3 font-sans">
            {canComposePost ? (
                <button
                    type="button"
                    onClick={openPostComposer}
                    className="flex w-full items-center gap-3 rounded-3xl border border-event-card-line bg-event-card px-4 py-3 focus-ring"
                >
                    {line}
                    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(image:--logo) text-white">
                        <Plus className="size-4" />
                    </span>
                </button>
            ) : (
                <p className="flex w-full items-center rounded-3xl bg-event-card px-4 py-3">{line}</p>
            )}
        </div>
    );
}
