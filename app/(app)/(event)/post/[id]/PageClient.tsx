'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use, useEffect } from 'react';

import { PostRedirectState } from '@/components/post/PostRedirectState';
import { usePost } from '@/hooks';
import { ApiError } from '@/lib/api/client';
import { routes } from '@/lib/routes';

export default function PostRedirectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const t = useTranslations('PostModal');
    const { data: post, error } = usePost(id);

    useEffect(() => {
        if (post) router.replace(routes.post.feedWithPost(post.eventId, post.id));
    }, [post, router]);

    const notFound = error instanceof ApiError && error.status === 404;

    return (
        <PostRedirectState
            error={error}
            errorDescription={notFound ? t('notFoundDescription') : t('loadFailedDescription')}
            errorTitle={notFound ? t('notFoundTitle') : t('loadFailedTitle')}
            errorActionLabel={t('backToFeed')}
            loadingLabel={t('loading')}
        />
    );
}
