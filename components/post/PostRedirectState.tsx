import { PostRedirectErrorState } from '@/components/post/PostRedirectErrorState';
import { PostRedirectLoadingState } from '@/components/post/PostRedirectLoadingState';

export function PostRedirectState({
    error,
    errorDescription,
    errorTitle,
    errorActionLabel,
    loadingLabel,
}: {
    error: unknown;
    errorDescription: string;
    errorTitle: string;
    errorActionLabel: string;
    loadingLabel: string;
}) {
    if (error) {
        return <PostRedirectErrorState title={errorTitle} description={errorDescription} actionLabel={errorActionLabel} />;
    }

    return <PostRedirectLoadingState label={loadingLabel} />;
}
