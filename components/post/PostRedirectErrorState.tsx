import { PageErrorState } from '@/components/ui/PageErrorState';
import { routes } from '@/lib/routes';

export function PostRedirectErrorState({ title, description, actionLabel }: { title: string; description: string; actionLabel: string }) {
    return <PageErrorState title={title} description={description} actionHref={routes.feed} actionLabel={actionLabel} />;
}
