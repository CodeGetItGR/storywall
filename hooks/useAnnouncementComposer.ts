'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCreatePost } from '@/hooks/usePosts';
import { announcementBlock } from '@/lib/announcement';
import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

// One message, posted as an ANNOUNCEMENT post (posts have no title), then back to the feed.
// Hosts and planners write it; the server refuses anyone else (4008) and a planner past the access window (4033).
export function useAnnouncementComposer(eventId: string) {
    const t = useTranslations('Vendors');
    const tComposer = useTranslations('ComposerCard');
    const router = useRouter();
    const toErrorMessage = useApiErrorMessage();
    const { data: appConfig } = useAppConfig();
    const createPost = useCreatePost();
    const block = announcementBlock(useActiveEvent());
    const [content, setContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const maxLength = appConfig?.contentLimits.postContentMaxLength ?? 500;
    const blockedMessage = block === 'readOnly' ? tComposer('eventReadOnly') : block === 'moduleUnavailable' ? tComposer('moduleUnavailable') : null;

    const handleContentChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setContent(event.target.value), []);

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (blockedMessage) return;
            const message = content.trim();
            if (!message) {
                setError(t('announcement.empty'));
                return;
            }
            setError(null);
            try {
                await createPost.mutateAsync({ eventId, type: 'ANNOUNCEMENT', content: message, isPinned: false });
                router.push(routes.events.feed(eventId));
            } catch (postError) {
                setError(toErrorMessage(postError));
            }
        },
        [blockedMessage, content, createPost, eventId, router, t, toErrorMessage],
    );

    return { content, setContent, handleContentChange, maxLength, error, blockedMessage, isPosting: createPost.isPending, handleSubmit };
}
