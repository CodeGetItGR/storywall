export function PostRedirectState({
    error,
    errorDescription,
    errorTitle,
    loadingLabel,
}: {
    error: unknown;
    errorDescription: string;
    errorTitle: string;
    loadingLabel: string;
}) {
    if (error) {
        return <PostRedirectErrorState title={errorTitle} description={errorDescription} />;
    }

    return <PostRedirectLoadingState label={loadingLabel} />;
}

function PostRedirectErrorState({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
            <p className="mb-1 text-base font-semibold text-ink">{title}</p>
            <p className="text-sm text-ink-muted">{description}</p>
        </div>
    );
}

function PostRedirectLoadingState({ label }: { label: string }) {
    return <div className="flex min-h-[70vh] items-center justify-center text-sm text-ink-muted">{label}</div>;
}
