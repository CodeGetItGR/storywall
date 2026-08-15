import { PageErrorState } from '@/components/ui/PageErrorState';
import { routes } from '@/lib/routes';

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

function PostRedirectErrorState({ title, description, actionLabel }: { title: string; description: string; actionLabel: string }) {
    return <PageErrorState title={title} description={description} actionHref={routes.feed} actionLabel={actionLabel} />;
}

function PostRedirectLoadingState({ label }: { label: string }) {
    return <div className="flex min-h-[70vh] items-center justify-center text-sm text-ink-muted">{label}</div>;
}
