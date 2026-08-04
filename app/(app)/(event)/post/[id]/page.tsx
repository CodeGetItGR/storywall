'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { use, useEffect } from 'react';

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

    if (error) {
        const notFound = error instanceof ApiError && error.status === 404;
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
                <p className="text-base font-semibold text-ink mb-1">{notFound ? t('notFoundTitle') : t('loadFailedTitle')}</p>
                <p className="text-sm text-ink-muted">{notFound ? t('notFoundDescription') : t('loadFailedDescription')}</p>
            </div>
        );
    }

    return <div className="min-h-[70vh] flex items-center justify-center text-sm text-ink-muted">{t('loading')}</div>;
}
