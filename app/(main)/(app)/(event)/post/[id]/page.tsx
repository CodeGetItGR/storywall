import { redirect } from 'next/navigation';

import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { PostResponseDto } from '@/lib/api/types';
import { redirectAccessToken } from '@/lib/auth/serverEventContext';
import { routes } from '@/lib/routes';

import PostRedirectPage from './PageClient';

type PageProps = { params: Promise<{ id: string }> };

async function findPost(id: string): Promise<PostResponseDto | null> {
    const accessToken = await redirectAccessToken();
    if (!accessToken) return null;

    try {
        return await serverGet<PostResponseDto>(endpoints.posts.byId(id), accessToken);
    } catch {
        return null;
    }
}

// A link to one post (an email, a notification, a share) opens it in its
// event's feed, straight from the server. The page only renders when the
// server couldn't load the post: it tries again in the browser and shows why
// if that fails too.
export default async function PostPage({ params }: PageProps) {
    const { id } = await params;
    const post = await findPost(id);

    if (post) redirect(routes.events.feed(post.eventId, { post: post.id }));

    return <PostRedirectPage id={id} />;
}
