'use client';

import { type ChangeEvent, useCallback, useRef } from 'react';

import { useUploadAccept } from '@/hooks/useUploadAccept';
import { useComposer } from '@/providers/composer/ComposerContext';

// The photo prompt: a tap opens the file picker, and the picked photos open in the post composer. The input is the
// prompt's own and is clicked inside the tap: iPhone refuses a picker opened later, and the composer's input isn't on
// the page until the composer has loaded.
export function useFeedPhotoPrompt() {
    const { openPostWithFiles, canComposePost } = useComposer();
    const accept = useUploadAccept().media;
    const inputRef = useRef<HTMLInputElement>(null);
    const pick = useCallback(() => inputRef.current?.click(), []);
    const onFiles = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            openPostWithFiles(event.target.files);
            // So that the same photo can be picked again.
            event.target.value = '';
        },
        [openPostWithFiles],
    );

    return { canPost: canComposePost, accept, inputRef, pick, onFiles };
}
