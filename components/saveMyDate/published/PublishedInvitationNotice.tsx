import { ReloadButton } from '@/components/saveMyDate/published/ReloadButton';

type PublishedInvitationNoticeProps = {
    title: string;
    // Shows a button that loads the page again.
    retryLabel?: string;
};

// A plain page in place of an invitation that can't be shown.
export function PublishedInvitationNotice({ title, retryLabel }: PublishedInvitationNoticeProps) {
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 py-16 text-center">
            {/* Message */}
            <h1 className="max-w-md text-2xl font-bold text-balance text-ink lg:text-3xl">{title}</h1>

            {/* Retry */}
            {retryLabel && <ReloadButton label={retryLabel} />}
        </main>
    );
}
